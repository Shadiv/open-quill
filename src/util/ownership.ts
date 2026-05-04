type StampParams = { version: string }

// Legacy ownership marker. No longer written by stampOwnedFrontmatter — it
// pushed YAML frontmatter off line 1 and broke opencode's parser, hiding
// agents from the picker. Detection is retained so files written by older
// versions still register as managed until they're rewritten.
const SENTINEL = "<!-- open-quill:managed -->"

export function isOwnedByOpenQuill(content: string): boolean {
  const lines = content.split(/\r?\n/)
  const head = lines.slice(0, 50).join("\n")
  if (head.includes(SENTINEL)) return true
  // YAML frontmatter — accept it on line 1, or on line 2 if line 1 is the
  // legacy sentinel (already covered above), so that the frontmatter check
  // still works for the canonical layout we now write.
  if (lines[0] !== "---") return false
  const fmEnd = lines.indexOf("---", 1)
  if (fmEnd < 0) return false
  const fm = lines.slice(1, fmEnd).join("\n")
  return /\bx_openquill\s*:/m.test(fm)
}

export function stampOwnedFrontmatter(content: string, params: StampParams): string {
  let lines = content.split(/\r?\n/)
  // Auto-migrate: drop any legacy sentinel on line 1 so the rewritten file
  // has frontmatter on line 1 where opencode expects it.
  if (lines[0]?.trim() === SENTINEL) lines = lines.slice(1)

  const stamp = `x_openquill: { managed: true, version: \"${params.version}\" }`

  if (lines[0] !== "---") {
    return ["---", stamp, "---", ...lines].join("\n")
  }

  // Insert or update within existing frontmatter.
  const fmEnd = lines.indexOf("---", 1)
  if (fmEnd === -1) return lines.join("\n")

  const fmLines = lines.slice(1, fmEnd)
  const rest = lines.slice(fmEnd)
  const existingIdx = fmLines.findIndex((l) => /^x_openquill\s*:/i.test(l.trim()))
  if (existingIdx >= 0) fmLines[existingIdx] = stamp
  else fmLines.push(stamp)
  return ["---", ...fmLines, ...rest].join("\n")
}
