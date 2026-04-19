import { tool } from "@opencode-ai/plugin"

import { detectConfigRoot, getStateDir } from "../util/state.js"
import { loadProjectPrefs, saveProjectPrefs } from "../util/prefs.js"

export const setProjectLanguageTool = tool({
  description: "Set the Open Quill per-project default output language (keyed by worktree path).",
  args: {
    language: tool.schema
      .string()
      .min(1)
      .describe('Language code/name (e.g. "ru", "en").'),
  },
  async execute(args, context) {
    const configRoot = detectConfigRoot()
    const stateDir = getStateDir(configRoot)
    const prefs = await loadProjectPrefs(stateDir)
    prefs.languageByWorktree ??= {}
    prefs.languageByWorktree[context.worktree] = args.language
    await saveProjectPrefs(stateDir, prefs)
    return `Open Quill: project default output language set to "${args.language}" for worktree ${context.worktree}.`
  },
})
