import { defineConfig } from "tsup"
import { cp } from "node:fs/promises"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  tsconfig: "tsconfig.build.json",
  onSuccess: async () => {
    await cp("assets", "dist/assets", { recursive: true })
  },
})
