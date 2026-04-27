import type { ToolDefinition } from "@opencode-ai/plugin"

import { extractCanonTool } from "./extract_canon.js"
import { proseDiffTool } from "./prose_diff.js"
import { continuityCheckTool } from "./continuity_check.js"
import { buildStyleProfileTool } from "./build_style_profile.js"
import { makeSetProjectLanguageTool } from "./set_project_language.js"
import { scanManuscriptsTool } from "./scan_manuscripts.js"
import { makeReadManuscriptChunkTool } from "./read_manuscript_chunk.js"
import { makeCanonMergeTool } from "./canon_merge.js"
import { makeCanonSnapshotTool } from "./canon_snapshot.js"

export function makeTools(params: { stateDir: string }): Record<string, ToolDefinition> {
  return {
    extract_canon: extractCanonTool,
    prose_diff: proseDiffTool,
    continuity_check: continuityCheckTool,
    build_style_profile: buildStyleProfileTool,
    set_project_language: makeSetProjectLanguageTool({ stateDir: params.stateDir }),
    scan_manuscripts: scanManuscriptsTool,
    read_manuscript_chunk: makeReadManuscriptChunkTool({ stateDir: params.stateDir }),
    canon_merge: makeCanonMergeTool({ stateDir: params.stateDir }),
    canon_snapshot: makeCanonSnapshotTool({ stateDir: params.stateDir }),
  }
}
