import { tool } from "@opencode-ai/plugin"

import { loadProjectPrefs, saveProjectPrefs } from "../util/prefs.js"

export function makeSetProjectLanguageTool(params: { stateDir: string }) {
  return tool({
    description: "Set the Open Quill per-project default output language (keyed by worktree path).",
    args: {
      language: tool.schema
        .string()
        .min(1)
        .describe('Language code/name (e.g. "ru", "en").'),
    },
    async execute(args, context) {
      const prefs = await loadProjectPrefs(params.stateDir)
      prefs.languageByWorktree ??= {}
      prefs.languageByWorktree[context.worktree] = args.language
      await saveProjectPrefs(params.stateDir, prefs)
      return `Open Quill: project default output language set to "${args.language}" for worktree ${context.worktree}.`
    },
  })
}
