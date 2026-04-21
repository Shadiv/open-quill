import { describe, expect, it } from "vitest"
import os from "node:os"
import path from "node:path"
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises"

import { isOwnedByOpenQuill, stampOwnedFrontmatter } from "../src/util/ownership.js"
import { fileExists, readText, writeTextAtomic } from "../src/util/fs.js"

/**
 * These tests verify the install decision logic used by installTemplates
 * in plugin.ts. We replicate the decision flow with real filesystem operations
 * in temp directories instead of importing the private function.
 */

type InstallMode = "owned-only" | "if-missing" | "force"
type BackupMode = "on-force" | "always" | "never"

/** Replicates the per-file install decision from plugin.ts */
async function installDecision(params: {
  destPath: string
  assetContent: string
  installMode: InstallMode
  backupMode: BackupMode
  version: string
}): Promise<"installed" | "updated" | "skipped"> {
  const { destPath, assetContent, installMode, backupMode, version } = params
  const exists = await fileExists(destPath)

  if (!exists) {
    const stamped = stampOwnedFrontmatter(assetContent, { version })
    await writeTextAtomic(destPath, stamped)
    return "installed"
  }

  if (installMode === "if-missing") {
    return "skipped"
  }

  const current = await readText(destPath)
  const owned = isOwnedByOpenQuill(current)
  const isForce = installMode === "force"

  if (!owned && !isForce) {
    return "skipped"
  }

  // Backup logic
  const shouldBackup = backupMode === "always" || (backupMode === "on-force" && isForce)
  if (shouldBackup) {
    const bak = `${destPath}.bak`
    await writeFile(bak, current, "utf8")
  }

  const stamped = stampOwnedFrontmatter(assetContent, { version })
  await writeTextAtomic(destPath, stamped)
  return "updated"
}

async function tmpDir(prefix: string): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), `open-quill-${prefix}-`))
}

const SAMPLE_ASSET = "---\ndescription: test agent\n---\nYou are **Test**."

describe("install decision logic", () => {
  it("installs to fresh directory (no existing files)", async () => {
    const dir = await tmpDir("fresh")
    const dest = path.join(dir, "agents", "test.md")
    const result = await installDecision({
      destPath: dest,
      assetContent: SAMPLE_ASSET,
      installMode: "owned-only",
      backupMode: "on-force",
      version: "1.0.0",
    })
    expect(result).toBe("installed")
    const content = await readFile(dest, "utf8")
    expect(isOwnedByOpenQuill(content)).toBe(true)
    expect(content).toContain("test agent")
  })

  it("updates owned file with older version", async () => {
    const dir = await tmpDir("owned-update")
    await mkdir(path.join(dir, "agents"), { recursive: true })
    const dest = path.join(dir, "agents", "test.md")
    // Write an "old" owned file
    const oldContent = stampOwnedFrontmatter("---\ndescription: old\n---\nOld body.", { version: "0.9.0" })
    await writeFile(dest, oldContent, "utf8")

    const result = await installDecision({
      destPath: dest,
      assetContent: SAMPLE_ASSET,
      installMode: "owned-only",
      backupMode: "on-force",
      version: "1.0.0",
    })
    expect(result).toBe("updated")
    const content = await readFile(dest, "utf8")
    expect(content).toContain("test agent")
    expect(content).toContain("1.0.0")
  })

  it("skips non-owned file in owned-only mode", async () => {
    const dir = await tmpDir("nonowned-skip")
    await mkdir(path.join(dir, "agents"), { recursive: true })
    const dest = path.join(dir, "agents", "test.md")
    // Write a user-created file (no ownership stamp)
    await writeFile(dest, "---\ndescription: user file\n---\nUser content.", "utf8")

    const result = await installDecision({
      destPath: dest,
      assetContent: SAMPLE_ASSET,
      installMode: "owned-only",
      backupMode: "on-force",
      version: "1.0.0",
    })
    expect(result).toBe("skipped")
    const content = await readFile(dest, "utf8")
    expect(content).toContain("User content")
  })

  it("overwrites non-owned file in force mode", async () => {
    const dir = await tmpDir("force-overwrite")
    await mkdir(path.join(dir, "agents"), { recursive: true })
    const dest = path.join(dir, "agents", "test.md")
    await writeFile(dest, "---\ndescription: user file\n---\nUser content.", "utf8")

    const result = await installDecision({
      destPath: dest,
      assetContent: SAMPLE_ASSET,
      installMode: "force",
      backupMode: "on-force",
      version: "1.0.0",
    })
    expect(result).toBe("updated")
    const content = await readFile(dest, "utf8")
    expect(content).toContain("test agent")
    // Backup should have been created
    const bakExists = await fileExists(`${dest}.bak`)
    expect(bakExists).toBe(true)
    const bakContent = await readFile(`${dest}.bak`, "utf8")
    expect(bakContent).toContain("User content")
  })

  it("skips existing file in if-missing mode", async () => {
    const dir = await tmpDir("ifmissing-skip")
    await mkdir(path.join(dir, "agents"), { recursive: true })
    const dest = path.join(dir, "agents", "test.md")
    await writeFile(dest, "existing content", "utf8")

    const result = await installDecision({
      destPath: dest,
      assetContent: SAMPLE_ASSET,
      installMode: "if-missing",
      backupMode: "on-force",
      version: "1.0.0",
    })
    expect(result).toBe("skipped")
    const content = await readFile(dest, "utf8")
    expect(content).toBe("existing content")
  })

  it("creates backup with backup: always when overwriting owned file", async () => {
    const dir = await tmpDir("backup-always")
    await mkdir(path.join(dir, "agents"), { recursive: true })
    const dest = path.join(dir, "agents", "test.md")
    const oldContent = stampOwnedFrontmatter("---\ndescription: old\n---\nOld.", { version: "0.9.0" })
    await writeFile(dest, oldContent, "utf8")

    const result = await installDecision({
      destPath: dest,
      assetContent: SAMPLE_ASSET,
      installMode: "owned-only",
      backupMode: "always",
      version: "1.0.0",
    })
    expect(result).toBe("updated")
    const bakExists = await fileExists(`${dest}.bak`)
    expect(bakExists).toBe(true)
  })

  it("creates backup with backup: on-force when force-overwriting", async () => {
    const dir = await tmpDir("backup-onforce")
    await mkdir(path.join(dir, "agents"), { recursive: true })
    const dest = path.join(dir, "agents", "test.md")
    await writeFile(dest, "user file content", "utf8")

    await installDecision({
      destPath: dest,
      assetContent: SAMPLE_ASSET,
      installMode: "force",
      backupMode: "on-force",
      version: "1.0.0",
    })
    const bakExists = await fileExists(`${dest}.bak`)
    expect(bakExists).toBe(true)
  })

  it("does NOT create backup with backup: never", async () => {
    const dir = await tmpDir("backup-never")
    await mkdir(path.join(dir, "agents"), { recursive: true })
    const dest = path.join(dir, "agents", "test.md")
    await writeFile(dest, "user file content", "utf8")

    await installDecision({
      destPath: dest,
      assetContent: SAMPLE_ASSET,
      installMode: "force",
      backupMode: "never",
      version: "1.0.0",
    })
    const bakExists = await fileExists(`${dest}.bak`)
    expect(bakExists).toBe(false)
  })
})
