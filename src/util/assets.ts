import path from "node:path"
import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

function assetsRoot(): string {
  // Bundled layout: dist/index.js → dist/assets/
  const bundled = fileURLToPath(new URL("./assets/", import.meta.url))
  if (existsSync(bundled)) return bundled
  // Source / dev layout: src/util/assets.ts → <pkg>/assets/
  const source = fileURLToPath(new URL("../../assets/", import.meta.url))
  if (existsSync(source)) return source
  throw new Error("Open Quill: could not locate assets directory")
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
  return readFile(abs, "utf8")
}
