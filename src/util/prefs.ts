import path from "node:path"
import { mkdir, writeFile } from "node:fs/promises"

export type ProjectPrefs = {
  languageByWorktree?: Record<string, string>
}

export async function loadProjectPrefs(stateDir: string): Promise<ProjectPrefs> {
  const p = path.join(stateDir, "prefs.json")
  try {
    const t = await Bun.file(p).text()
    return JSON.parse(t) as ProjectPrefs
  } catch {
    return {}
  }
}

export async function saveProjectPrefs(stateDir: string, prefs: ProjectPrefs) {
  await mkdir(stateDir, { recursive: true })
  const p = path.join(stateDir, "prefs.json")
  await writeFile(p, JSON.stringify(prefs, null, 2), "utf8")
}
