import { describe, expect, it } from "vitest"
import os from "node:os"
import path from "node:path"
import { mkdtemp, readFile } from "node:fs/promises"

import { loadProjectPrefs, saveProjectPrefs } from "../src/util/prefs.js"

describe("prefs", () => {
  it("roundtrips project prefs", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "open-quill-prefs-"))
    await saveProjectPrefs(dir, { languageByWorktree: { "/tmp/worktree": "ru" } })
    const loaded = await loadProjectPrefs(dir)
    expect(loaded.languageByWorktree?.["/tmp/worktree"]).toBe("ru")
  })
})
