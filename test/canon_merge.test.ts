import { describe, expect, it } from "vitest"
import os from "node:os"
import path from "node:path"
import { mkdtemp } from "node:fs/promises"

import { emptyCanonDB, upsertVariant } from "../src/util/canon.js"

describe("canon", () => {
  it("keeps variants and flags conflict", () => {
    const a = upsertVariant({ variants: [], value: "blue" })
    expect(a.conflict).toBe(false)
    const b = upsertVariant({ variants: a.variants, value: "black" })
    expect(b.conflict).toBe(true)
    expect(b.variants).toEqual(["blue", "black"])
  })
})
