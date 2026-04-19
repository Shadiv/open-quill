import path from "node:path"
import { readdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"

function assetsRoot(): string {
  // Works both from src/ and dist/ because util/assets is two levels below package root.
  return fileURLToPath(new URL("../../assets/", import.meta.url))
}

async function listDirMd(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name)
}

export async function listAssetFiles(): Promise<string[]> {
  const root = assetsRoot()
  const out: string[] = []
  for (const f of await listDirMd(path.join(root, "agents"))) out.push(`agents/${f}`)
  for (const f of await listDirMd(path.join(root, "commands"))) out.push(`commands/${f}`)
  return out
}

export async function readAssetText(assetPath: string): Promise<string> {
  const abs = path.join(assetsRoot(), assetPath)
  return Bun.file(abs).text()
}
