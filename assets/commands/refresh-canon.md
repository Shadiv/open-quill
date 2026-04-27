---
description: Refresh canon files from latest manuscript
agent: lorekeeper
subtask: true
---
Refresh canon from the manuscript (or provided paths: $ARGUMENTS).

## Workflow
1. Call `scan_manuscripts` to locate manuscript files.
2. Use the **Manuscript Reading Loop** for large manuscripts:
   - Read in chunks via `read_manuscript_chunk`
   - For each chunk: extract facts with `extract_canon`, classify them, use `canon_merge` to integrate
   - Update markdown canon files after each chunk
3. For targeted updates (user specifies chapters), read only those sections.

## Canon files to update
- `characters.md` — new characters, updated descriptions, relationship changes, arc progression
- `locations.md` — new locations, description updates
- `timeline.md` — new events, chronological ordering
- `glossary.md` — new terms, slang, in-world vocabulary
- `world_rules.md` — new rules or rule modifications
- `continuity_watchlist.md` — flag any contradictions found

## Character updates
For main characters: update the full dossier (role, age, appearance, background, current status, personality, relationships, plot function, arc).
For secondary characters: update the brief description if new information is available.

## Conflict handling
- When a contradiction is detected, keep both variants in the canon (labeled as unresolved).
- Add to `continuity_watchlist.md` with source references.
- Do NOT silently resolve conflicts — the author decides.

Ask before editing any canon file.
