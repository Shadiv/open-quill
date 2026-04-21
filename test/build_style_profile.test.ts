import { describe, expect, it } from "vitest"
import { buildStyleProfileTool } from "../src/tools/build_style_profile.js"

const ctx: any = {
  sessionID: "test",
  messageID: "test",
  agent: "test",
  directory: "/tmp",
  worktree: "/tmp",
  abort: new AbortController().signal,
  metadata: () => {},
}

function run(samples: string[]): Promise<string> {
  return buildStyleProfileTool.execute({ samples }, ctx) as Promise<string>
}

describe("build_style_profile", () => {
  it("produces valid metrics for English text", async () => {
    const sample = [
      "The old man walked slowly down the empty street. He had nowhere to go.",
      "The rain fell in sheets. Nobody was out. The city slept under a grey sky.",
    ].join("\n\n")

    const result = await run([sample])
    expect(result).toContain("# Style Profile")
    expect(result).toContain("Average sentence length:")
    expect(result).toContain("words")
    expect(result).toContain("Dialogue ratio:")
    expect(result).toContain("Vocabulary richness")
    expect(result).toContain("Point of view:")
    expect(result).toContain("Dominant tense:")
    // Should detect third person and past tense
    expect(result).toContain("third-person")
    expect(result).toContain("past")
  })

  it("produces valid metrics for Russian text", async () => {
    const sample = [
      "Старик медленно шёл по пустой улице. Ему некуда было идти.",
      "Дождь лил стеной. Никого не было на улицах. Город спал под серым небом.",
    ].join("\n\n")

    const result = await run([sample])
    expect(result).toContain("# Style Profile")
    expect(result).toContain("Average sentence length:")
    expect(result).toContain("Vocabulary richness")
    // Should have parsed words correctly (non-zero count)
    expect(result).not.toContain("Total words: 0")
  })

  it("detects high dialogue ratio for quoted speech", async () => {
    const sample = [
      '"Hello," she said. "How are you?"',
      '"I am fine," he replied. "And you?"',
      '"Never better," she smiled.',
      "They stood in silence for a moment.",
    ].join("\n")

    const result = await run([sample])
    expect(result).toContain("Dialogue ratio:")
    // 3 of 4 lines have quotes -> 75%
    const match = result.match(/Dialogue ratio:\s*([\d.]+)%/)
    expect(match).not.toBeNull()
    const ratio = parseFloat(match![1])
    expect(ratio).toBeGreaterThan(50)
  })

  it("detects high dialogue ratio for dash-dialogue", async () => {
    const sample = [
      "— Привет!",
      "— Пока!",
      "— Как дела?",
      "— Нормально.",
    ].join("\n")

    const result = await run([sample])
    const match = result.match(/Dialogue ratio:\s*([\d.]+)%/)
    expect(match).not.toBeNull()
    const ratio = parseFloat(match![1])
    expect(ratio).toBeGreaterThanOrEqual(100)
  })

  it("reports short average sentence length for terse prose", async () => {
    const sample = "He ran. She stopped. Rain fell. Wind blew. Night came."

    const result = await run([sample])
    const match = result.match(/Average sentence length:\s*([\d.]+)\s*words\s*\((\w+)\)/)
    expect(match).not.toBeNull()
    const avg = parseFloat(match![1])
    const label = match![2]
    expect(avg).toBeLessThan(5)
    expect(label).toBe("short")
  })

  it("detects first-person POV", async () => {
    const sample = "I walked down the street. My heart was pounding. I knew I had to run."
    const result = await run([sample])
    expect(result).toContain("first-person")
  })

  it("handles multiple samples", async () => {
    const result = await run(["Hello world.", "Goodbye world."])
    expect(result).toContain("Samples: 2")
  })
})
