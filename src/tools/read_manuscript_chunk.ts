import { tool } from "@opencode-ai/plugin"
import path from "node:path"

import { detectConfigRoot, getStateDir } from "../util/state.js"
import { ensureProjectStateDir } from "../util/project_state.js"
import { ensureDocxCache, readTextChunk } from "../util/manuscript.js"
import { fileExists } from "../util/fs.js"

export const readManuscriptChunkTool = tool({
  description: "Read the next chunk of a manuscript file (.txt/.md/.mdx/.docx) using a cursor for iterative summarization.",
  args: {
    path: tool.schema.string().describe("Path to a manuscript file (relative to session directory or absolute)."),
    cursor: tool.schema.number().int().min(0).optional().describe("Cursor offset (chars). Default 0."),
    maxChars: tool.schema.number().int().min(1000).max(50000).optional().describe("Max characters to return (default 12000)."),
  },
  async execute(args, context) {
    const maxChars = args.maxChars ?? 12000
    const cursor = args.cursor ?? 0
    const abs = path.isAbsolute(args.path) ? args.path : path.join(context.directory, args.path)
    if (!(await fileExists(abs))) throw new Error(`File not found: ${abs}`)

    const ext = path.extname(abs).toLowerCase()
    let readPath = abs
    let cacheInfo: { cachePath: string; textLength: number } | undefined

    if (ext === ".docx") {
      const configRoot = detectConfigRoot()
      const stateDir = getStateDir(configRoot)
      const projectDir = await ensureProjectStateDir(stateDir, context.worktree)
      const cacheDir = path.join(projectDir, "docx_cache")
      const { cachePath, textLength } = await ensureDocxCache({ cacheDir, absPath: abs })
      readPath = cachePath
      cacheInfo = { cachePath, textLength }
    }

    const chunk = await readTextChunk({ absPath: readPath, cursor, maxChars })
    return JSON.stringify(
      {
        file: path.relative(context.worktree, abs),
        cursor,
        cursorNext: chunk.cursorNext,
        done: chunk.done,
        text: chunk.text,
        cache: cacheInfo ? { path: cacheInfo.cachePath, textLength: cacheInfo.textLength } : undefined,
      },
      null,
      2,
    )
  },
})
