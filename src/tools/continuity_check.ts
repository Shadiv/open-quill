import { tool } from "@opencode-ai/plugin"

export const continuityCheckTool = tool({
  description: "Perform a lightweight continuity check for a chapter against canon notes.",
  args: {
    chapter: tool.schema.string().describe("Chapter text"),
    canon: tool.schema.string().optional().describe("Canon notes (characters/locations/timeline/etc)")
  },
  async execute(args) {
    const issues: string[] = []
    if (args.canon) {
      // Very lightweight heuristics for v1.
      const canonNames = Array.from(
        new Set(
          (args.canon.match(/\b[\p{Lu}][\p{L}\p{M}'-]{2,}\b/gu) ?? []).slice(0, 200),
        ),
      )
      const missing = canonNames.filter((n) => !args.chapter.includes(n)).slice(0, 25)
      if (missing.length) {
        issues.push(`Canon mentions names not seen in chapter (may be ok): ${missing.join(", ")}`)
      }
    } else {
      issues.push("No canon provided; continuity check is best-effort.")
    }

    return [
      "## Continuity Check (v1 heuristic)",
      "",
      ...(issues.length ? issues.map((i) => `- ${i}`) : ["- No obvious issues found by heuristics."]),
      "",
      "Notes: This tool is intentionally conservative and heuristic-based. Use the critic agent for deeper analysis.",
    ].join("\n")
  },
})
