import { existsSync } from "node:fs"
import { readdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"

const distIndex = fileURLToPath(new URL("../dist/index.js", import.meta.url))
if (!existsSync(distIndex)) {
  console.error(`[smoke] dist/index.js not found at ${distIndex}. Run 'npm run build' first.`)
  process.exit(1)
}

const distAssets = fileURLToPath(new URL("../dist/assets/", import.meta.url))
if (!existsSync(distAssets)) {
  console.error(`[smoke] dist/assets/ missing — tsup onSuccess hook did not run.`)
  process.exit(1)
}

const agentsDir = path.join(distAssets, "agents")
const commandsDir = path.join(distAssets, "commands")
const agents = (await readdir(agentsDir)).filter((f) => f.endsWith(".md"))
const commands = (await readdir(commandsDir)).filter((f) => f.endsWith(".md"))

if (agents.length === 0) {
  console.error(`[smoke] no agent markdown files in ${agentsDir}`)
  process.exit(1)
}
if (commands.length === 0) {
  console.error(`[smoke] no command markdown files in ${commandsDir}`)
  process.exit(1)
}

const mod = await import(distIndex)
if (!mod.OpenQuill || typeof mod.OpenQuill !== "function") {
  console.error(`[smoke] dist/index.js does not export OpenQuill as a function`)
  process.exit(1)
}
if (!mod.default || mod.default.id !== "open-quill" || typeof mod.default.server !== "function") {
  console.error(`[smoke] dist/index.js default export is not a valid PluginModule`)
  process.exit(1)
}

console.log(`[smoke] OK — ${agents.length} agents, ${commands.length} commands, exports intact`)
