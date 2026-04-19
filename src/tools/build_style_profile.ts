import { tool } from "@opencode-ai/plugin"

export const buildStyleProfileTool = tool({
  description: "Build a lightweight style profile from sample text.",
  args: {
    samples: tool.schema.array(tool.schema.string()).min(1).describe("Sample text passages"),
  },
  async execute(args) {
    const totalChars = args.samples.reduce((n, s) => n + s.length, 0)
    return [
      "# style_profile.md (draft)",
      "",
      "## Source", 
      `- Samples: ${args.samples.length}`,
      `- Total characters: ${totalChars}`,
      "",
      "## Observations (fill/adjust)",
      "- Preferred sentence length: (short/medium/long)",
      "- Paragraph rhythm: (dense/airy)",
      "- Dialogue style: (tags, punctuation, pacing)",
      "- Point of view: (1st/3rd, close/distant)",
      "- Tone: (formal/informal, humorous/serious)",
      "- Common motifs/imagery:",
      "",
      "## Constraints", 
      "- Preserve manuscript language and register.",
    ].join("\n")
  },
})
