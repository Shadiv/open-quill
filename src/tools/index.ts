import type { ToolDefinition } from "@opencode-ai/plugin"

import { extractCanonTool } from "./extract_canon.js"
import { proseDiffTool } from "./prose_diff.js"
import { continuityCheckTool } from "./continuity_check.js"
import { buildStyleProfileTool } from "./build_style_profile.js"
import { setProjectLanguageTool } from "./set_project_language.js"

export function makeTools(_params: { configRoot: string }): Record<string, ToolDefinition> {
  return {
    extract_canon: extractCanonTool,
    prose_diff: proseDiffTool,
    continuity_check: continuityCheckTool,
    build_style_profile: buildStyleProfileTool,
    set_project_language: setProjectLanguageTool,
  }
}
