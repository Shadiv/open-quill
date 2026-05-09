---
description: Prime a writing project (summary + canon + style)
agent: writer
---

Prime the project from manuscript files (or the provided paths: $ARGUMENTS).

## Step 0: Detect language

Call `scan_manuscripts` to locate files, then `read_manuscript_chunk` on a sample to detect the manuscript language. If a project default output language is set via `/writing-lang`, ALL output MUST be in that language. Otherwise use the detected manuscript language for all output and created files. Any project file created or updated by this workflow MUST live under `openquill/` at the workspace root; if `openquill/` does not exist, create it first.

## Step 1: Reading loop

Process manuscripts in chronological order (Chapter 1 → 2 → 3, Book 1 → 2 → 3, etc.).

For each file, read in digestible chunks using `read_manuscript_chunk` (REQUIRED for `.docx` — the built-in read tool cannot parse them):

1. Read a chunk (3000–5000 words).
2. Extract canon candidates using `extract_canon`.
3. Merge extracted facts into the canon DB using `canon_merge`.
4. Delegate to `@summarizer` for chapter/section summary if the file is long.
5. Clear context and move to the next chunk.

Do NOT try to read the entire manuscript at once. Process incrementally.

## Step 2: Generate canon files

After processing all manuscript content, call `canon_snapshot` to render the canon DB into markdown files:

- `openquill/characters.md` — character dossiers (detailed for main, brief for secondary)
- `openquill/locations.md`
- `openquill/timeline.md`
- `openquill/glossary.md`
- `openquill/world_rules.md`

Review the generated files. If canon coverage is thin or contradictory, flag the gaps and suggest running `@lorekeeper` for a deeper pass.

## Step 3: Style profile

If representative prose samples exist, build/update `openquill/style_profile.md`:
- Use `build_style_profile` on 3–5 representative samples.
- Delegate to `@stylematcher` for structured analysis if the profile needs enrichment.

## Step 4: Project brief

Create or update `openquill/project_brief.md` with:
- Genre, POV, tense
- Core premise (1–2 sentences)
- Main characters (names only, with cross-ref to `openquill/characters.md`)
- Current story state (where are we in the narrative?)
- Open threads and unresolved plot lines

## Step 5: Summary

Create or update `openquill/summary.md` with:
- Chapter-by-chapter bullet summary
- Current character status
- Open threads

## Output files

Ask before overwriting any existing files. The following are created/updated:

- `openquill/project_brief.md`
- `openquill/summary.md`
- `openquill/characters.md`, `openquill/locations.md`, `openquill/timeline.md`, `openquill/glossary.md`, `openquill/world_rules.md`
- `openquill/style_profile.md` (optional)

## Notes

- Dual canon storage: `canon_merge`/`canon_snapshot` manage the JSON DB (source of truth) and render markdown views. Do NOT edit the markdown files directly — always go through the tools.
- If `openquill/plot.md` exists from prior `@plotter` work, read it for context but do not modify it.
- If a project default output language is set, all output MUST be in that language. Otherwise respond in the detected manuscript language. Preserve manuscript language in all edits.
