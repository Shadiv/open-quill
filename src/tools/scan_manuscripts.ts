import { tool } from "@opencode-ai/plugin"
import fg from "fast-glob"
import path from "node:path"

import { DEFAULT_IGNORE_GLOBS } from "../util/scan.js"

export const scanManuscriptsTool = tool({
  description: "Find manuscript files in the project (md/mdx/txt/docx) with strong ignore defaults.",
  args: {
    roots: tool.schema.array(tool.schema.string()).optional().describe("Optional roots (relative to session directory or absolute)."),
    maxFiles: tool.schema.number().int().min(1).max(20000).optional().describe("Max files to return (default 2000)."),
  },
  async execute(args, context) {
    const maxFiles = args.maxFiles ?? 2000
    const roots = (args.roots?.length ? args.roots : [context.worktree]).map((r) => (path.isAbsolute(r) ? r : path.join(context.directory, r)))
    const patterns = roots.map((r) => path.join(r, "**/*.{md,mdx,txt,docx}"))
    const files = await fg(patterns, { ignore: DEFAULT_IGNORE_GLOBS, onlyFiles: true, unique: true, dot: false })
    const rel = files.map((f) => path.relative(context.worktree, f))
    const hasDocx = rel.some((f) => f.toLowerCase().endsWith(".docx"))
    const note = hasDocx
      ? "Use 'read_manuscript_chunk' to read any of these files. REQUIRED for .docx — the built-in read tool will fail on them."
      : "Use 'read_manuscript_chunk' to read any of these files."
    return JSON.stringify({ count: rel.length, files: rel.slice(0, maxFiles), note }, null, 2)
  },
})
