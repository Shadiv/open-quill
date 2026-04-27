---
description: Edit selected text conservatively
agent: editor
---
Edit the text the user provides (or the file/section they reference in $ARGUMENTS).

## Before editing
1. Read `style_profile.md`. If missing, call `@stylematcher` to build it first.
2. Internalize the author's voice: sentence rhythm, paragraph density, dialogue style, vocabulary, register.
3. Read the target passage using `read_manuscript_chunk` if it's in a file.

## Editing
1. Propose changes in before/after blocks:
   ```
   BEFORE: "original text"
   AFTER:  "edited text"
   REASON: why this change
   ```
2. Every edit MUST preserve the author's voice — reference style_profile.md metrics.
3. Categorize edits: grammar, clarity, flow, consistency, voice drift correction.

## After editing
1. If edits are extensive, call `prose_diff` with original and revised text to summarize changes.
2. For non-trivial edits (≥ 5 changes), call `@style_checker` to verify the edited text still matches the style profile.
3. Preserve manuscript language and register in all edits.

Respond in the user's language. Preserve manuscript language in edits.
