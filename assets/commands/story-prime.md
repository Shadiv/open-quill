---
description: Prime a writing project (summary + canon + style)
agent: writer
---
Scan the project manuscript (or the provided paths: $ARGUMENTS) with `scan_manuscripts`.

Read manuscript files with `read_manuscript_chunk` — NOT the built-in read tool. This is REQUIRED for `.docx` files (binary ZIP archives that the built-in read tool cannot parse).

Before doing anything else, detect the manuscript language by calling `read_manuscript_chunk` on a sample of the files returned by `scan_manuscripts`. Use that language as the default for all output and created files unless the user has set an explicit language preference.

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
