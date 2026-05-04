import { describe, expect, it } from "vitest"

import { isOwnedByOpenQuill, stampOwnedFrontmatter } from "../src/util/ownership.js"

describe("ownership", () => {
  it("detects owned files by frontmatter", () => {
    const content = [
      "<!-- open-quill:managed -->",
      "---",
      "description: test",
      "x_openquill: { managed: true, version: \"0.1.0\" }",
      "---",
      "body",
    ].join("\n")
    expect(isOwnedByOpenQuill(content)).toBe(true)
  })

  it("stamps frontmatter when missing", () => {
    const stamped = stampOwnedFrontmatter("hello", { version: "0.1.0" })
    expect(stamped).toContain("x_openquill")
    expect(isOwnedByOpenQuill(stamped)).toBe(true)
  })

  // opencode's frontmatter parser requires "---" on line 1; a leading HTML
  // comment used to shift it down and hide agents from the picker.
  it("writes YAML frontmatter on line 1", () => {
    const fresh = stampOwnedFrontmatter("hello", { version: "0.1.0" })
    expect(fresh.split(/\r?\n/)[0]).toBe("---")

    const existingFm = stampOwnedFrontmatter("---\ndescription: x\n---\nbody", { version: "0.1.0" })
    expect(existingFm.split(/\r?\n/)[0]).toBe("---")
    expect(existingFm).not.toContain("<!-- open-quill:managed -->")
  })

  it("strips a legacy sentinel on rewrite (auto-migration)", () => {
    const legacy = [
      "<!-- open-quill:managed -->",
      "---",
      "description: old",
      "x_openquill: { managed: true, version: \"0.1.0\" }",
      "---",
      "body",
    ].join("\n")
    const stamped = stampOwnedFrontmatter(legacy, { version: "0.2.0" })
    expect(stamped.split(/\r?\n/)[0]).toBe("---")
    expect(stamped).not.toContain("<!-- open-quill:managed -->")
    expect(stamped).toContain("0.2.0")
    expect(isOwnedByOpenQuill(stamped)).toBe(true)
  })
})
