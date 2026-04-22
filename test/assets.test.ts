import { describe, expect, it } from "vitest"

import { listAssetFiles, readAssetText } from "../src/util/assets.js"

describe("asset resolution (source layout)", () => {
  it("lists every agent and command markdown file", async () => {
    const files = await listAssetFiles()

    const agents = files.filter((f) => f.startsWith("agents/"))
    const commands = files.filter((f) => f.startsWith("commands/"))

    expect(agents.length).toBeGreaterThan(0)
    expect(commands.length).toBeGreaterThan(0)
    expect(agents).toContain("agents/writer.md")
    expect(agents).toContain("agents/editor.md")
    expect(commands).toContain("commands/story-prime.md")
    expect(commands).toContain("commands/writing-lang.md")

    for (const f of files) {
      expect(f.endsWith(".md")).toBe(true)
    }
  })

  it("reads asset content as non-empty text", async () => {
    const body = await readAssetText("agents/writer.md")
    expect(body.length).toBeGreaterThan(0)
    expect(body).toMatch(/^---/m)
  })
})
