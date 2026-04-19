import type { Plugin, PluginModule } from "@opencode-ai/plugin"

import { openQuillServer } from "./plugin.js"

export const OpenQuill: Plugin = openQuillServer

// Export a PluginModule as default for compatibility with loaders expecting it.
const moduleExport: PluginModule = {
  id: "open-quill",
  server: openQuillServer,
}

export default moduleExport
