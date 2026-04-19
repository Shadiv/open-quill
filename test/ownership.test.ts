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
})
