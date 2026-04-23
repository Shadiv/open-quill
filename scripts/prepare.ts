#!/usr/bin/env bun
import { cpSync, rmSync } from "fs"
import { existsSync } from "fs"
import pkg from "../package.json"

const external = Object.keys(pkg.dependencies ?? {})

if (existsSync("dist")) rmSync("dist", { recursive: true })

const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  format: "esm",
  target: "bun",
  external,
  sourcemap: "external",
})

if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

cpSync("assets", "dist/assets", { recursive: true })
console.log(`Built ${result.outputs.length} file(s), assets copied.`)
