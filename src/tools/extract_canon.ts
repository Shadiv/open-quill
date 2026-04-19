import { tool } from "@opencode-ai/plugin"
import fg from "fast-glob"
import path from "node:path"
import mammoth from "mammoth"

import { readText, fileExists } from "../util/fs.js"
import { DEFAULT_IGNORE_GLOBS, isProbablyBinary } from "../util/scan.js"

type Canon = {
  characters: string[]
  locations: string[]
  timeline: string[]
  rules: string[]
  threads: string[]
  notes: string[]
}

async function readDocxText(filePath: string) {
  const res = await mammoth.extractRawText({ path: filePath })
  return res.value ?? ""
}

function extractCapitalizedTokens(text: string): string[] {
  const tokens = text.match(/\b[\p{Lu}][\p{L}\p{M}'-]{2,}\b/gu) ?? []
  // Drop common sentence starters.
  const stop = new Set(["The", "A", "An", "And", "But", "Or", "I", "We", "He", "She", "They", "It", "This", "That", "Вот", "Это", "И", "Но", "А", "Он", "Она", "Они", "Мы", "Я"]) 
  return Array.from(new Set(tokens.filter((t) => !stop.has(t)))).slice(0, 500)
}

export const extractCanonTool = tool({
  description:
    "Scan manuscript files (md/txt/docx) and return structured canon candidates (characters, locations, timeline points, rules, unresolved threads).",
  args: {
    paths: tool.schema.array(tool.schema.string()).optional().describe("File or directory paths. If omitted, scan the worktree."),
    maxFiles: tool.schema.number().int().min(1).max(5000).optional().describe("Maximum files to scan (default 500)."),
  },
  async execute(args, context) {
    const maxFiles = args.maxFiles ?? 500
    const roots = (args.paths?.length ? args.paths : [context.worktree]).map((p) => (path.isAbsolute(p) ? p : path.join(context.directory, p)))

    const patterns: string[] = []
    for (const r of roots) {
      const statExists = await fileExists(r)
      if (!statExists) continue
      const ext = path.extname(r).toLowerCase()
      if ([".md", ".mdx", ".txt", ".docx"].includes(ext)) {
        patterns.push(r)
      } else {
        // directory or unknown: glob within
        patterns.push(path.join(r, "**/*.{md,mdx,txt,docx}"))
      }
    }

    const files = (await fg(patterns, { ignore: DEFAULT_IGNORE_GLOBS, dot: false, onlyFiles: true, unique: true })).slice(0, maxFiles)

    let corpus = ""
    const notes: string[] = []
    for (const f of files) {
      const ext = path.extname(f).toLowerCase()
      try {
        if (ext === ".docx") {
          corpus += `\n\n# FILE: ${path.relative(context.worktree, f)}\n` + (await readDocxText(f))
        } else {
          const t = await readText(f)
          if (isProbablyBinary(t)) continue
          corpus += `\n\n# FILE: ${path.relative(context.worktree, f)}\n` + t
        }
      } catch (e) {
        notes.push(`Failed to read ${path.relative(context.worktree, f)}: ${(e as Error).message}`)
      }
      if (corpus.length > 2_000_000) {
        notes.push("Corpus truncated to ~2MB for tool output.")
        break
      }
    }

    const caps = extractCapitalizedTokens(corpus)

    // Heuristic grouping for v1.
    const canon: Canon = {
      characters: caps.slice(0, 60),
      locations: caps.slice(60, 100),
      timeline: [],
      rules: [],
      threads: [],
      notes: [
        `Scanned ${files.length} files (maxFiles=${maxFiles}).`,
        "Heuristic extraction only. Use lorekeeper/critic agents to refine canon.",
        ...notes,
      ],
    }

    return JSON.stringify(canon, null, 2)
  },
})
