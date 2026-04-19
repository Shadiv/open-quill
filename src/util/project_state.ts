import path from "node:path"
import { createHash } from "node:crypto"
import { mkdir } from "node:fs/promises"

export function worktreeKey(worktree: string): string {
  return createHash("sha256").update(worktree).digest("hex").slice(0, 16)
}

export function getProjectStateDir(stateDir: string, worktree: string): string {
  return path.join(stateDir, "projects", worktreeKey(worktree))
}

export async function ensureProjectStateDir(stateDir: string, worktree: string): Promise<string> {
  const dir = getProjectStateDir(stateDir, worktree)
  await mkdir(dir, { recursive: true })
  return dir
}
