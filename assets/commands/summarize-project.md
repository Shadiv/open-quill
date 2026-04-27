---
description: Summarize the manuscript/project
agent: summarizer
subtask: true
---
Summarize the manuscript (or the provided paths: $ARGUMENTS).

## Workflow
1. Call `scan_manuscripts` to discover all manuscript files.
2. Order files chronologically when possible (Chapter 1, 2, 3... or Book 1, 2, 3...).
3. For large manuscripts, use the **Manuscript Reading Loop**: read in chunks via `read_manuscript_chunk`, summarize each chunk, then synthesize.
4. Extract facts using `extract_canon` to cross-reference your summary against what's in the text.

## Output format
```markdown
## Overall Summary
[2-3 paragraph high-level summary of the entire story arc]

## Chapter Summaries
### Chapter N: [Title if available]
- Key events: [what happens]
- Characters involved: [who appears]
- Setting: [where/when]
- New information: [what the reader learns]

## Character Status Overview
- [Character Name]: current state, relationships, unresolved tensions

## Open Threads
- [Thread description]: what is unresolved, where it was last referenced, chapters involved

## Coverage
- Files processed: X/Y
- Chapters covered: [list]
- Gaps: [any sections not covered]
```

Use the user's language (English/Russian). Preserve manuscript language in all excerpts.
