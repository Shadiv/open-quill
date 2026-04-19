export const DEFAULT_IGNORE_GLOBS = [
  "**/.git/**",
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.opencode/**",
  "**/.open-quill/**",
  "**/.cache/**",
]

export function isProbablyBinary(text: string): boolean {
  // Heuristic: if contains many NULs.
  const nul = text.includes("\u0000")
  return nul
}
