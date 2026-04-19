# Open Quill

Open Quill is an OpenCode plugin that installs writing-focused agents and commands and provides custom tools for fiction/non-fiction workflows.

## Install

1. Install the plugin package:

```bash
npm install open-quill
```

2. Enable it in your `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["open-quill", { "installMode": "owned-only" }]]
}
```

On startup, Open Quill installs agents into `~/.config/opencode/agents/` and commands into `~/.config/opencode/commands/` (Windows: `%USERPROFILE%\\.config\\opencode`).

## Usage

- Switch to the `writer` or `editor` agents in OpenCode.
- Run commands like `/story-prime`, `/edit-selection`, `/continuity-check`.
- Set a per-project default output language with `/writing-lang ru`.
