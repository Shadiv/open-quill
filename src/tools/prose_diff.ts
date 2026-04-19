import { tool } from "@opencode-ai/plugin"
import { diffLines } from "diff"

export const proseDiffTool = tool({
  description: "Summarize differences between original and revised prose.",
  args: {
    original: tool.schema.string().describe("Original text"),
    revised: tool.schema.string().describe("Revised text"),
  },
  async execute(args) {
    const parts = diffLines(args.original, args.revised)
    let added = 0
    let removed = 0
    for (const p of parts) {
      const lines = p.value.split(/\r?\n/).length - 1
      if (p.added) added += lines
      if (p.removed) removed += lines
    }

    const snippet = parts
      .slice(0, 200)
      .map((p) => {
        const prefix = p.added ? "+" : p.removed ? "-" : " "
        return p.value
          .split(/\r?\n/)
          .slice(0, 50)
          .map((l) => `${prefix}${l}`)
          .join("\n")
      })
      .join("\n")

    return [
      `## Prose Diff Summary`,
      `- Lines added: ${added}`,
      `- Lines removed: ${removed}`,
      "",
      "```diff",
      snippet.trimEnd(),
      "```",
    ].join("\n")
  },
})
