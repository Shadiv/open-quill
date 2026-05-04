---
description: Refresh canon files from latest manuscript
agent: writer
---

## Delegation target: @lorekeeper

The user wants to refresh/update canon files from the manuscript. Delegate to **@lorekeeper** with the following instructions.

### Delegation instructions

1. **Pass scope**: Forward `$ARGUMENTS` to @lorekeeper as the paths or scope of the refresh (full manuscript or specific chapters).
2. **Ensure manuscript reading**: @lorekeeper should:
   - Call `scan_manuscripts` to locate manuscript files.
   - Use the Manuscript Reading Loop for large manuscripts: read in chunks via `read_manuscript_chunk`, extract facts with `extract_canon`, classify them, use `canon_merge` to integrate.
   - For targeted updates, read only the specified sections.
3. **Canon files to update**: @lorekeeper should update these files:
   - `characters.md` — new characters, updated descriptions, relationship changes, arc progression
   - `locations.md` — new locations, description updates
   - `timeline.md` — new events, chronological ordering
   - `glossary.md` — new terms, slang, in-world vocabulary
   - `world_rules.md` — new rules or rule modifications
   - `continuity_watchlist.md` — flag any contradictions found
4. **Conflict handling**: When contradictions are detected, keep both variants labeled as unresolved. Add to `continuity_watchlist.md` with source references. Do NOT silently resolve conflicts.
5. **Ask before editing** any canon file.

### Language
If a project default output language is set, all output must be in that language. Otherwise detect from manuscript or user input.
