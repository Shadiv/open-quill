import path from "node:path"
import { createHash } from "node:crypto"
import { stat, readFile, writeFile, mkdir } from "node:fs/promises"
import mammoth from "mammoth"

import { ensureDir, fileExists, readText } from "./fs.js"

function hashString(input: string): string {
  return createHash("sha256").update(input).digest("hex")
}

export async function ensureDocxCache(params: {
  cacheDir: string
  absPath: string
}): Promise<{ cachePath: string; metaPath: string; textLength: number }>
  {
  const { cacheDir, absPath } = params
  await mkdir(cacheDir, { recursive: true })

  const s = await stat(absPath)
  const key = hashString(`${absPath}|${s.mtimeMs}|${s.size}`).slice(0, 24)
  const cachePath = path.join(cacheDir, `${key}.txt`)
  const metaPath = path.join(cacheDir, `${key}.json`)

  if (await fileExists(cachePath)) {
    const t = await readText(cachePath)
    return { cachePath, metaPath, textLength: t.length }
  }

  const res = await mammoth.extractRawText({ path: absPath })
  const text = res.value ?? ""
  await writeFile(cachePath, text, "utf8")
  await writeFile(metaPath, JSON.stringify({ source: absPath, mtimeMs: s.mtimeMs, size: s.size }, null, 2), "utf8")
  return { cachePath, metaPath, textLength: text.length }
}

export async function readTextChunk(params: {
  absPath: string
  cursor: number
  maxChars: number
}): Promise<{ text: string; cursorNext: number; done: boolean }>
  {
  const { absPath, cursor, maxChars } = params
  const full = await readText(absPath)
  const start = Math.max(0, cursor)
  const end = Math.min(full.length, start + maxChars)
  const text = full.slice(start, end)
  return { text, cursorNext: end, done: end >= full.length }
}
