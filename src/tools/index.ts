import type { ToolDefinition } from "@opencode-ai/plugin"

import { extractCanonTool } from "./extract_canon.js"
import { proseDiffTool } from "./prose_diff.js"
import { continuityCheckTool } from "./continuity_check.js"
import { buildStyleProfileTool } from "./build_style_profile.js"
import { setProjectLanguageTool } from "./set_project_language.js"
import { scanManuscriptsTool } from "./scan_manuscripts.js"
import { readManuscriptChunkTool } from "./read_manuscript_chunk.js"
import { canonMergeTool } from "./canon_merge.js"
import { canonSnapshotTool } from "./canon_snapshot.js"

export function makeTools(_params: { configRoot: string }): Record<string, ToolDefinition> {
  return {
    extract_canon: extractCanonTool,
    prose_diff: proseDiffTool,
    continuity_check: continuityCheckTool,
    build_style_profile: buildStyleProfileTool,
    set_project_language: setProjectLanguageTool,
    scan_manuscripts: scanManuscriptsTool,
    read_manuscript_chunk: readManuscriptChunkTool,
    canon_merge: canonMergeTool,
    canon_snapshot: canonSnapshotTool,
  }
}
