import path from "node:path"
import { mkdir, writeFile } from "node:fs/promises"

export type TemplateRecord = {
  path: string
  asset: string
  kind: "agent" | "command"
  version: string
}

export type OpenQuillManifest = {
  version: string
  files: TemplateRecord[]
}

export function detectConfigRoot(): string {
  const xdg = Bun.env.XDG_CONFIG_HOME
  if (xdg) return path.join(xdg, "opencode")

  const userProfile = Bun.env.USERPROFILE
  if (userProfile) return path.join(userProfile, ".config", "opencode")

  const home = Bun.env.HOME
  if (home) return path.join(home, ".config", "opencode")

  // last resort
  return path.resolve(".opencode")
}

export function getStateDir(configRoot: string): string {
  return path.join(configRoot, ".open-quill")
}

export async function loadManifest(stateDir: string): Promise<OpenQuillManifest> {
  const p = path.join(stateDir, "manifest.json")
  try {
    const t = await Bun.file(p).text()
    const parsed = JSON.parse(t) as OpenQuillManifest
    return {
      version: parsed.version ?? "0.0.0",
      files: Array.isArray(parsed.files) ? parsed.files : [],
    }
  } catch {
    return { version: "0.0.0", files: [] }
  }
}

export async function saveManifest(stateDir: string, manifest: OpenQuillManifest) {
  await mkdir(stateDir, { recursive: true })
  const p = path.join(stateDir, "manifest.json")
  await writeFile(p, JSON.stringify(manifest, null, 2), "utf8")
}
