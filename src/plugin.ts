import type { Hooks, Plugin, PluginOptions, ToolContext } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import path from "node:path"

import { ensureDir, fileExists, readText, writeTextAtomic } from "./util/fs.js"
import { listAssetFiles, readAssetText } from "./util/assets.js"
import {
  detectConfigRoot,
  getStateDir,
  loadManifest,
  saveManifest,
  type OpenQuillManifest,
  type TemplateRecord,
} from "./util/state.js"
import { isOwnedByOpenQuill, stampOwnedFrontmatter } from "./util/ownership.js"
import { makeTools } from "./tools/index.js"
import { loadProjectPrefs, saveProjectPrefs, type ProjectPrefs } from "./util/prefs.js"

type InstallMode = "owned-only" | "if-missing" | "force"
type BackupMode = "on-force" | "always" | "never"

type Options = {
  installMode?: InstallMode
  backup?: BackupMode
  defaultLanguage?: string
}

function normalizeOptions(options?: PluginOptions): Required<Pick<Options, "installMode" | "backup">> & {
  defaultLanguage?: string
} {
  const o = (options ?? {}) as Options
  return {
    installMode: o.installMode ?? "owned-only",
    backup: o.backup ?? "on-force",
    defaultLanguage: o.defaultLanguage,
  }
}

function maybeToast(client: any, body: { message: string; variant?: "success" | "error" | "warning" | "info" }) {
  // Fire-and-forget. Awaiting this during plugin bootstrap deadlocks the
  // host: the toast endpoint exists but the TUI consumer hasn't started
  // until plugin loading completes.
  Promise.resolve()
    .then(() => client.tui.showToast({ body: { message: body.message, variant: body.variant ?? "info" } }))
    .catch(() => {})
}

async function backupFileIfNeeded(filePath: string, backupMode: BackupMode, isForce: boolean) {
  const shouldBackup = backupMode === "always" || (backupMode === "on-force" && isForce)
  if (!shouldBackup) return
  if (!(await fileExists(filePath))) return
  const bak = `${filePath}.bak`
  const content = await readText(filePath)
  await writeTextAtomic(bak, content)
}

async function installTemplates(params: {
  configRoot: string
  options: ReturnType<typeof normalizeOptions>
  version: string
  client: any
}): Promise<{ installed: string[]; updated: string[]; skipped: string[] }>
  {
  const { configRoot, options, version, client } = params
  const assets = await listAssetFiles()

  const targets: Array<{ assetPath: string; destPath: string; kind: "agent" | "command" }> = []
  for (const ap of assets) {
    if (ap.startsWith("agents/")) {
      targets.push({ assetPath: ap, destPath: path.join(configRoot, "agents", path.basename(ap)), kind: "agent" })
    } else if (ap.startsWith("commands/")) {
      targets.push({ assetPath: ap, destPath: path.join(configRoot, "commands", path.basename(ap)), kind: "command" })
    }
  }

  await ensureDir(path.join(configRoot, "agents"))
  await ensureDir(path.join(configRoot, "commands"))

  const manifest: OpenQuillManifest = await loadManifest(getStateDir(configRoot))
  manifest.version = version
  manifest.files ??= []

  const installed: string[] = []
  const updated: string[] = []
  const skipped: string[] = []

  for (const t of targets) {
    const exists = await fileExists(t.destPath)
    if (!exists) {
      const raw = await readAssetText(t.assetPath)
      const stamped = stampOwnedFrontmatter(raw, { version })
      await writeTextAtomic(t.destPath, stamped)
      installed.push(t.destPath)
      manifest.files = manifest.files.filter((r) => r.path !== t.destPath)
      manifest.files.push({ path: t.destPath, asset: t.assetPath, kind: t.kind, version } satisfies TemplateRecord)
      continue
    }

    // if-missing: never overwrite
    if (options.installMode === "if-missing") {
      skipped.push(t.destPath)
      continue
    }

    const current = await readText(t.destPath)
    const owned = isOwnedByOpenQuill(current)
    const isForce = options.installMode === "force"

    if (!owned && options.installMode !== "force") {
      // user file; skip
      skipped.push(t.destPath)
      continue
    }

    // Skip if this file is already at the current version (no-op on same version startup)
    const existing = manifest.files.find((r) => r.path === t.destPath)
    if (owned && existing?.version === version) {
      skipped.push(t.destPath)
      continue
    }

    // owned update or force overwrite
    await backupFileIfNeeded(t.destPath, options.backup, isForce)
    const raw = await readAssetText(t.assetPath)
    const stamped = stampOwnedFrontmatter(raw, { version })
    await writeTextAtomic(t.destPath, stamped)
    updated.push(t.destPath)
    manifest.files = manifest.files.filter((r) => r.path !== t.destPath)
    manifest.files.push({ path: t.destPath, asset: t.assetPath, kind: t.kind, version } satisfies TemplateRecord)
  }

  await saveManifest(getStateDir(configRoot), manifest)

  if (installed.length || updated.length) {
    maybeToast(client, { message: `Open Quill installed/updated writing templates (${installed.length} new, ${updated.length} updated)`, variant: "success" })
  }
  if (skipped.length) {
    maybeToast(client, { message: `Open Quill skipped ${skipped.length} existing templates (name collisions)`, variant: "warning" })
  }

  return { installed, updated, skipped }
}

export const openQuillServer: Plugin = async (ctx, options) => {
  const o = normalizeOptions(options)
  const configRoot = detectConfigRoot()

  // Load package version (best-effort). If this fails, we still proceed.
  let version = "0.0.0"
  try {
    const pkgUrl = new URL("../package.json", import.meta.url)
    const pkg = JSON.parse(await Bun.file(pkgUrl).text()) as { version?: string }
    version = pkg.version ?? version
  } catch {
    // ignore
  }

  const BUILTIN_READ_IDS = new Set(["read", "file_read", "Read"])

  // Layer 2 enforcement: track which agent is active per session, so we can
  // detect drafting-loop skips on text completion. Populated from chat.params.
  const sessionAgent = new Map<string, string>()
  const LOOP_ENFORCED_AGENTS = new Set(["writer", "cowriter"])
  // Threshold below which we treat output as "not a draft" (questions, status, short edits).
  const DRAFT_MIN_CHARS = 1500
  const SCOREBOARD_STYLE_RE = /Style\s*:\s*\d+\s*\/\s*25/i
  const SCOREBOARD_CRITIQUE_RE = /Critique\s*:\s*\d+\s*\/\s*25/i

  // TODO (Layer 3 enforcement?): Hard tool-gate on file commits.
  // If a draft is written/edited to a manuscript file, require @style_checker AND @critic
  // to have fired in the current draft cycle (track via tool.execute.after subagent
  // invocations) and throw in tool.execute.before with a retry instruction otherwise.
  // Maintenance cost: keeping a canon-file path whitelist (plot.md, summary.md,
  // characters.md, locations.md, timeline.md, world_rules.md, style_profile.md,
  // continuity_watchlist.md, project_brief.md) in sync with the prompts. Add only if
  // Layers 1+2 leak too much in practice.

  const hooks: Hooks = {
    tool: makeTools({ configRoot }),

    // Hard block: refuse built-in read on .docx so the model must use read_manuscript_chunk.
    "tool.execute.before": async (input, output) => {
      if (!BUILTIN_READ_IDS.has(input.tool)) return
      const a = output.args ?? {}
      const fp: unknown = a.filePath ?? a.path ?? a.file
      if (typeof fp !== "string") return
      if (!fp.toLowerCase().endsWith(".docx")) return
      throw new Error(
        `Open Quill: the built-in '${input.tool}' tool cannot read .docx files (binary ZIP archives). ` +
          `Use the 'read_manuscript_chunk' tool instead — it extracts and caches text via mammoth. ` +
          `Retry with: read_manuscript_chunk({ path: ${JSON.stringify(fp)}, cursor: 0 })`,
      )
    },

    // Layer 2: record the agent driving each session so text-complete can check it.
    "chat.params": async (input, _output) => {
      sessionAgent.set(input.sessionID, input.agent)
    },

    // Layer 2: detect long-form prose from writer/cowriter that's missing the loop scoreboard.
    // Append a self-correcting reminder so the next turn re-runs the gates.
    "experimental.text.complete": async (input, output) => {
      const agent = sessionAgent.get(input.sessionID)
      if (!agent || !LOOP_ENFORCED_AGENTS.has(agent)) return
      const text = output.text ?? ""
      if (text.length < DRAFT_MIN_CHARS) return
      if (SCOREBOARD_STYLE_RE.test(text) && SCOREBOARD_CRITIQUE_RE.test(text)) return
      output.text =
        text +
        "\n\n---\n" +
        "Open Quill: drafting loop appears skipped — final scoreboard missing. " +
        "Per the Drafting protocol, non-trivial drafts MUST run @style_checker AND @critic " +
        "and end with `Style: X/25 · Critique: X/25 · N cycles`. Re-run the loop on this draft."
    },

    // Soft reminder: append a warning to the built-in read tool's description.
    "tool.definition": async (input, output) => {
      if (!BUILTIN_READ_IDS.has(input.toolID)) return
      output.description =
        (output.description ?? "") +
        "\n\nOpen Quill: DO NOT use this tool on .docx files — they are binary ZIP archives and will fail. " +
        "For any path ending in .docx, use read_manuscript_chunk instead."
    },

    // Enforce per-project language preference at the system layer.
    "experimental.chat.system.transform": async (_input, output) => {
      const prefs = await loadProjectPrefs(getStateDir(configRoot))
      const lang = prefs.languageByWorktree?.[ctx.worktree] ?? o.defaultLanguage
      if (!lang) return
      output.system.push(
        `Open Quill: Default output language for this project is \"${lang}\". Respond in this language unless the user explicitly requests otherwise.`,
      )
    },

    "experimental.session.compacting": async (_input, output) => {
      const prefs = await loadProjectPrefs(getStateDir(configRoot))
      const lang = prefs.languageByWorktree?.[ctx.worktree] ?? o.defaultLanguage
      if (lang) {
        output.context.push(`Open Quill: Project default output language is ${lang}.`) 
      }
      output.context.push(
        "Open Quill: You are operating in writing mode. Prefer preserving manuscript language and register. Canon/memory files (if present) are project_brief.md, summary.md, glossary.md, characters.md, locations.md, timeline.md, world_rules.md, style_profile.md, continuity_watchlist.md.",
      )
    },
  }

  // Bootstrap runs in the background so the plugin returns hooks immediately.
  // Awaiting host I/O here (toasts, app.log) before returning deadlocks the
  // host: those endpoints expect the TUI consumer, which only starts once
  // plugin loading completes.
  void (async () => {
    try {
      await ensureDir(getStateDir(configRoot))
      const result = await installTemplates({ configRoot, options: o, version, client: ctx.client })
      try {
        await ctx.client.app.log({
          body: {
            service: "open-quill",
            level: "info",
            message: "Templates install summary",
            extra: {
              version,
              installed: result.installed.map((p) => path.relative(configRoot, p)),
              updated: result.updated.map((p) => path.relative(configRoot, p)),
              skipped: result.skipped.map((p) => path.relative(configRoot, p)),
            },
          },
        })
      } catch {
        // ignore
      }
    } catch {
      // ignore — bootstrap is best-effort; templates re-attempt on next start
    }
  })()

  return hooks
}
