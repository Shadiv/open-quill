type StampParams = { version: string }

const SENTINEL = "<!-- open-quill:managed -->"

export function isOwnedByOpenQuill(content: string): boolean {
  const head = content.split(/\r?\n/).slice(0, 50).join("\n")
  if (head.includes(SENTINEL)) return true
  // YAML frontmatter
  if (!head.startsWith("---")) return false
  const endIdx = head.indexOf("\n---", 3)
  const fm = endIdx >= 0 ? head.slice(3, endIdx) : head
  return /\bx_openquill\s*:/m.test(fm)
}

export function stampOwnedFrontmatter(content: string, params: StampParams): string {
  const lines = content.split(/\r?\n/)
  const hasSentinel = lines[0]?.trim() === SENTINEL
  const withSentinel = hasSentinel ? lines : [SENTINEL, ...lines]

  if (withSentinel[1] !== "---") {
    // Ensure frontmatter exists.
    return [
      withSentinel[0],
      "---",
      `x_openquill: { managed: true, version: \"${params.version}\" }`,
      "---",
      ...withSentinel.slice(1),
    ].join("\n")
  }

  // Insert or update within existing frontmatter.
  const fmEnd = withSentinel.indexOf("---", 2)
  if (fmEnd === -1) return withSentinel.join("\n")

  const fmLines = withSentinel.slice(2, fmEnd)
  const rest = withSentinel.slice(fmEnd)
  const existingIdx = fmLines.findIndex((l) => /^x_openquill\s*:/i.test(l.trim()))
  const stamp = `x_openquill: { managed: true, version: \"${params.version}\" }`
  if (existingIdx >= 0) fmLines[existingIdx] = stamp
  else fmLines.push(stamp)
  return [withSentinel[0], "---", ...fmLines, ...rest].join("\n")
}
