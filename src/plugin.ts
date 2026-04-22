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

async function maybeToast(client: any, body: { message: string; variant?: "success" | "error" | "warning" | "info" }) {
  try {
    await client.tui.showToast({ body: { message: body.message, variant: body.variant ?? "info" } })
  } catch {
    // Best-effort; not all environments expose TUI.
  }
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
    await maybeToast(client, { message: `Open Quill installed/updated writing templates (${installed.length} new, ${updated.length} updated)`, variant: "success" })
  }
  if (skipped.length) {
    await maybeToast(client, { message: `Open Quill skipped ${skipped.length} existing templates (name collisions)`, variant: "warning" })
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

  const hooks: Hooks = {
    tool: makeTools({ configRoot }),

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

  // Bootstrap: install templates on startup.
  await ensureDir(getStateDir(configRoot))
  const result = await installTemplates({ configRoot, options: o, version, client: ctx.client })

  // Log outcomes (structured logging preferred).
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

  return hooks
}
