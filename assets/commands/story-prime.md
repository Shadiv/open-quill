---
description: Prime a writing project (summary + canon + style)
agent: writer
---
Scan the project manuscript (or the provided paths: $ARGUMENTS).

Before doing anything else, detect the manuscript language by reading a sample of the text files in the project folder. Use that language as the default for all output and created files unless the user has set an explicit language preference.

1. Summarize current story state.
2. Extract/update canon candidates using the `extract_canon` tool.
3. If style samples exist, draft/update `style_profile.md` (use `build_style_profile` if helpful).

Create or update these files in the project (ask before editing):
- project_brief.md
- summary.md
- characters.md
- locations.md
- timeline.md
- glossary.md
- world_rules.md
- style_profile.md (optional)

Respond in the detected manuscript language. Preserve manuscript language in all edits.
