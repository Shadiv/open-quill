import { tool } from "@opencode-ai/plugin"
import path from "node:path"

import { detectConfigRoot, getStateDir } from "../util/state.js"
import { ensureProjectStateDir } from "../util/project_state.js"
import { loadCanonDB, loadConflicts, renderVariants } from "../util/canon.js"

function renderKVSection(title: string, items: Array<{ key: string; value: string }>): string {
  const lines = [`# ${title}`, ""]
  if (!items.length) return lines.concat(["(empty)"]).join("\n")
  for (const it of items) lines.push(`- **${it.key}**: ${it.value}`)
  return lines.join("\n")
}

export const canonSnapshotTool = tool({
  description: "Render the current per-project canon DB into markdown files (characters/locations/glossary/world_rules/timeline) plus a watchlist.",
  args: {},
  async execute(_args, context) {
    const configRoot = detectConfigRoot()
    const stateDir = getStateDir(configRoot)
    const projectDir = await ensureProjectStateDir(stateDir, context.worktree)
    const db = await loadCanonDB(projectDir)
    const conflicts = await loadConflicts(projectDir)

    const charactersMd = (() => {
      const lines: string[] = ["# characters.md", ""]
      const names = Object.keys(db.characters).sort((a, b) => a.localeCompare(b))
      for (const name of names) {
        lines.push(`## ${name}`)
        const fields = db.characters[name].fields
        for (const f of Object.keys(fields).sort((a, b) => a.localeCompare(b))) {
          lines.push(`- ${renderVariants(f, fields[f])}`)
        }
        lines.push("")
      }
      return lines.join("\n").trimEnd()
    })()

    const locationsMd = (() => {
      const lines: string[] = ["# locations.md", ""]
      const names = Object.keys(db.locations).sort((a, b) => a.localeCompare(b))
      for (const name of names) {
        lines.push(`## ${name}`)
        const fields = db.locations[name].fields
        for (const f of Object.keys(fields).sort((a, b) => a.localeCompare(b))) {
          lines.push(`- ${renderVariants(f, fields[f])}`)
        }
        lines.push("")
      }
      return lines.join("\n").trimEnd()
    })()

    const glossaryMd = (() => {
      const lines: string[] = ["# glossary.md", ""]
      const terms = Object.keys(db.glossary).sort((a, b) => a.localeCompare(b))
      for (const term of terms) {
        const defs = db.glossary[term].definitions
        lines.push(`## ${term}`)
        for (const d of defs) lines.push(`- ${d}`)
        if (defs.length > 1) lines.push("- (unresolved variants)")
        lines.push("")
      }
      return lines.join("\n").trimEnd()
    })()

    const worldRulesMd = (() => {
      const lines: string[] = ["# world_rules.md", ""]
      const rules = Object.keys(db.world_rules).sort((a, b) => a.localeCompare(b))
      for (const r of rules) {
        lines.push(`## ${r}`)
        const vs = db.world_rules[r].variants
        for (const v of vs) lines.push(`- ${v}`)
        if (vs.length > 1) lines.push("- (unresolved variants)")
        lines.push("")
      }
      return lines.join("\n").trimEnd()
    })()

    const timelineMd = (() => {
      const lines: string[] = ["# timeline.md", ""]
      const keys = Object.keys(db.timeline).sort((a, b) => a.localeCompare(b))
      for (const k of keys) {
        const vs = db.timeline[k].variants
        lines.push(`- ${renderVariants(k, vs)}`)
      }
      if (!keys.length) lines.push("(empty)")
      return lines.join("\n").trimEnd()
    })()

    const watchlistMd = (() => {
      const lines: string[] = ["# continuity_watchlist.md", "", "## Open Conflicts", ""]
      const open = conflicts.filter((c) => c.status === "open")
      if (!open.length) return lines.concat(["(none)"]).join("\n")
      for (const c of open) {
        const field = c.field ? `.${c.field}` : ""
        lines.push(`- [ ] ${c.kind}:${c.key}${field} => { ${c.variants.join(" | ")} }`)
      }
      return lines.join("\n")
    })()

    return JSON.stringify(
      {
        characters: charactersMd,
        locations: locationsMd,
        glossary: glossaryMd,
        world_rules: worldRulesMd,
        timeline: timelineMd,
        continuity_watchlist: watchlistMd,
        state: {
          canonDBPath: path.join(projectDir, "canon_db.json"),
          conflictsPath: path.join(projectDir, "canon_conflicts.json"),
        },
      },
      null,
      2,
    )
  },
})
