import path from "node:path"
import { readFile, writeFile } from "node:fs/promises"

export type CanonDB = {
  version: 1
  characters: Record<string, { fields: Record<string, string[]>; notes?: string[] }>
  locations: Record<string, { fields: Record<string, string[]>; notes?: string[] }>
  glossary: Record<string, { definitions: string[] }>
  world_rules: Record<string, { variants: string[] }>
  timeline: Record<string, { variants: string[] }>
  threads: Record<string, { variants: string[] }>
}

export type CanonConflict = {
  kind: string
  key: string
  field?: string
  variants: string[]
  status: "open" | "resolved" | "ignored"
}

export function emptyCanonDB(): CanonDB {
  return {
    version: 1,
    characters: {},
    locations: {},
    glossary: {},
    world_rules: {},
    timeline: {},
    threads: {},
  }
}

export async function loadCanonDB(projectDir: string): Promise<CanonDB> {
  const p = path.join(projectDir, "canon_db.json")
  try {
    const raw = await readFile(p, "utf8")
    const parsed = JSON.parse(raw) as CanonDB
    if (parsed?.version !== 1) return emptyCanonDB()
    return parsed
  } catch {
    return emptyCanonDB()
  }
}

export async function saveCanonDB(projectDir: string, db: CanonDB) {
  const p = path.join(projectDir, "canon_db.json")
  await writeFile(p, JSON.stringify(db, null, 2), "utf8")
}

export async function loadConflicts(projectDir: string): Promise<CanonConflict[]> {
  const p = path.join(projectDir, "canon_conflicts.json")
  try {
    const raw = await readFile(p, "utf8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as CanonConflict[]) : []
  } catch {
    return []
  }
}

export async function saveConflicts(projectDir: string, conflicts: CanonConflict[]) {
  const p = path.join(projectDir, "canon_conflicts.json")
  await writeFile(p, JSON.stringify(conflicts, null, 2), "utf8")
}

function pushVariant(arr: string[], value: string): { changed: boolean; variants: string[] } {
  const v = value.trim()
  if (!v) return { changed: false, variants: arr }
  if (arr.some((x) => x.trim() === v)) return { changed: false, variants: arr }
  return { changed: true, variants: [...arr, v] }
}

export function upsertVariant(params: {
  variants: string[]
  value: string
}): { variants: string[]; changed: boolean; conflict: boolean } {
  const { variants, value } = params
  const next = pushVariant(variants, value)
  const conflict = next.variants.length > 1
  return { variants: next.variants, changed: next.changed, conflict }
}

export function renderVariants(label: string, variants: string[]): string {
  if (variants.length <= 1) return `${label}: ${variants[0] ?? ""}`.trimEnd()
  return `${label}: { ${variants.join(" | ")} } (unresolved)`
}
