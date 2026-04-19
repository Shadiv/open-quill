import { tool } from "@opencode-ai/plugin"
import path from "node:path"

import { detectConfigRoot, getStateDir } from "../util/state.js"
import { ensureProjectStateDir } from "../util/project_state.js"
import {
  loadCanonDB,
  saveCanonDB,
  loadConflicts,
  saveConflicts,
  upsertVariant,
  type CanonConflict,
} from "../util/canon.js"

type UpdateKind = "character" | "location" | "glossary" | "world_rule" | "timeline" | "thread"

export const canonMergeTool = tool({
  description:
    "Merge extracted canon updates into the per-project canon DB. Conflicting facts are kept as variants and logged as conflicts.",
  args: {
    updates: tool.schema
      .array(
        tool.schema.object({
          kind: tool.schema.enum(["character", "location", "glossary", "world_rule", "timeline", "thread"]),
          key: tool.schema.string().min(1).describe("Entity key (e.g. character name, term, rule label)."),
          field: tool.schema.string().optional().describe("Field name for character/location (e.g. age, hair, status)."),
          value: tool.schema.string().min(1).describe("Proposed value."),
        }),
      )
      .min(1)
      .describe("List of canon updates"),
  },
  async execute(args, context) {
    const configRoot = detectConfigRoot()
    const stateDir = getStateDir(configRoot)
    const projectDir = await ensureProjectStateDir(stateDir, context.worktree)
    const db = await loadCanonDB(projectDir)
    const conflicts = await loadConflicts(projectDir)

    const createdConflicts: CanonConflict[] = []

    for (const u of args.updates) {
      const kind = u.kind as UpdateKind
      const key = u.key.trim()
      const value = u.value.trim()
      if (!key || !value) continue

      if (kind === "character" || kind === "location") {
        const field = (u.field ?? "notes").trim()
        const table = kind === "character" ? db.characters : db.locations
        table[key] ??= { fields: {} }
        table[key].fields[field] ??= []
        const merged = upsertVariant({ variants: table[key].fields[field], value })
        table[key].fields[field] = merged.variants
        if (merged.conflict) {
          createdConflicts.push({ kind, key, field, variants: merged.variants, status: "open" })
        }
        continue
      }

      if (kind === "glossary") {
        db.glossary[key] ??= { definitions: [] }
        const merged = upsertVariant({ variants: db.glossary[key].definitions, value })
        db.glossary[key].definitions = merged.variants
        if (merged.conflict) createdConflicts.push({ kind, key, variants: merged.variants, status: "open" })
        continue
      }

      if (kind === "world_rule") {
        db.world_rules[key] ??= { variants: [] }
        const merged = upsertVariant({ variants: db.world_rules[key].variants, value })
        db.world_rules[key].variants = merged.variants
        if (merged.conflict) createdConflicts.push({ kind, key, variants: merged.variants, status: "open" })
        continue
      }

      if (kind === "timeline") {
        db.timeline[key] ??= { variants: [] }
        const merged = upsertVariant({ variants: db.timeline[key].variants, value })
        db.timeline[key].variants = merged.variants
        if (merged.conflict) createdConflicts.push({ kind, key, variants: merged.variants, status: "open" })
        continue
      }

      if (kind === "thread") {
        db.threads[key] ??= { variants: [] }
        const merged = upsertVariant({ variants: db.threads[key].variants, value })
        db.threads[key].variants = merged.variants
        if (merged.conflict) createdConflicts.push({ kind, key, variants: merged.variants, status: "open" })
        continue
      }
    }

    // De-dupe conflicts by (kind,key,field,variants)
    const existingKey = new Set(
      conflicts.map((c) => `${c.kind}|${c.key}|${c.field ?? ""}|${(c.variants ?? []).join("||")}`),
    )
    for (const c of createdConflicts) {
      const k = `${c.kind}|${c.key}|${c.field ?? ""}|${(c.variants ?? []).join("||")}`
      if (existingKey.has(k)) continue
      conflicts.push(c)
      existingKey.add(k)
    }

    await saveCanonDB(projectDir, db)
    await saveConflicts(projectDir, conflicts)

    return JSON.stringify(
      {
        updated: args.updates.length,
        conflictsAdded: createdConflicts.length,
        canonDBPath: path.join(projectDir, "canon_db.json"),
        conflictsPath: path.join(projectDir, "canon_conflicts.json"),
      },
      null,
      2,
    )
  },
})
