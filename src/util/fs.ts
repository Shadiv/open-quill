import path from "node:path"
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises"

export async function ensureDir(dirPath: string) {
  await mkdir(dirPath, { recursive: true })
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

export async function readText(filePath: string): Promise<string> {
  return readFile(filePath, "utf8")
}

export async function writeTextAtomic(filePath: string, content: string) {
  const dir = path.dirname(filePath)
  await ensureDir(dir)
  const tmp = `${filePath}.tmp.${Date.now()}`
  await writeFile(tmp, content, "utf8")
  await rename(tmp, filePath)
}
