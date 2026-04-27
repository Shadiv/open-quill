import { describe, expect, it, vi, afterEach } from "vitest"

import { detectProjectConfigRoot, resolveConfigRoot } from "../src/util/state.js"

describe("config root resolution", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("resolves project scope to <worktree>/.opencode", () => {
    const worktree = "/tmp/my-book"
    expect(detectProjectConfigRoot(worktree)).toBe("/tmp/my-book/.opencode")
    expect(resolveConfigRoot({ worktree, scope: "project" })).toBe("/tmp/my-book/.opencode")
  })

  it("resolves auto scope to global config root", () => {
    vi.stubEnv("XDG_CONFIG_HOME", "/tmp/xdg")
    const resolved = resolveConfigRoot({ worktree: "/tmp/my-book", scope: "auto" })
    expect(resolved).toBe("/tmp/xdg/opencode")
  })

  it("resolves global scope to global config root", () => {
    vi.stubEnv("HOME", "/tmp/home")
    vi.stubEnv("XDG_CONFIG_HOME", "")
    vi.stubEnv("USERPROFILE", "")
    const resolved = resolveConfigRoot({ worktree: "/tmp/my-book", scope: "global" })
    expect(resolved).toBe("/tmp/home/.config/opencode")
  })
})
