---
description: Summarize the manuscript/project
agent: writer
---

## Delegation target: @summarizer

The user wants a manuscript/project summary. Delegate to **@summarizer** with the following instructions.

### Delegation instructions

1. **Pass scope**: Forward `$ARGUMENTS` to @summarizer as the paths or scope (full manuscript or specific sections).
2. **Ensure manuscript reading**: @summarizer should:
   - Call `scan_manuscripts` to discover all manuscript files.
   - Order files chronologically (Chapter 1, 2, 3... or Book 1, 2, 3...).
   - For large manuscripts, use the Manuscript Reading Loop: read in chunks via `read_manuscript_chunk`, summarize each chunk, then synthesize.
   - Extract facts using `extract_canon` to cross-reference the summary against what's in the text.
3. **Output format**: @summarizer must produce:
   - Overall Summary (2-3 paragraph high-level summary)
   - Chapter Summaries (key events, characters involved, setting, new information per chapter)
   - Character Status Overview (current state, relationships, unresolved tensions)
   - Open Threads (what is unresolved, where last referenced, chapters involved)
   - Coverage report (files processed, chapters covered, gaps)
4. **Do NOT invent** plot details not present in the text.

### Language
If a project default output language is set, all output must be in that language. Otherwise detect from manuscript or user input. Preserve manuscript language in all excerpts.
