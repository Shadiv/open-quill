---
description: Critique a chapter (quality + continuity)
agent: writer
---

## Delegation target: @critic

The user wants a chapter critique. Delegate to **@critic** with the following instructions.

### Delegation instructions

1. **Pass the target**: Forward `$ARGUMENTS` to @critic as the chapter reference (file path, chapter name, or description).
2. **Ensure context loading**: @critic should:
   - Use `scan_manuscripts` to locate the chapter file.
   - Read the chapter using `read_manuscript_chunk` (REQUIRED for `.docx` files).
   - Read canon files: `openquill/characters.md`, `openquill/locations.md`, `openquill/timeline.md`, `openquill/world_rules.md`, `openquill/continuity_watchlist.md`.
   - If `openquill/style_profile.md` exists, read it for voice/style assessment.
   - Run `continuity_check` as the initial pass.
3. **Enforce critique protocol**: @critic MUST deliver:
   - Issues by severity (CRITICAL → MAJOR → MINOR → NOTE)
   - Continuity risks with specific canon contradictions
   - Concrete rewrite suggestions for every CRITICAL and MAJOR issue
   - QUALITY CHECK scores (Plot, Character, Continuity, Pacing, Resonance)
   - Final scoreboard: `Critique: <total>/25 — Plot:X Char:X Cont:X Pace:X Reson:X`
4. **If total < 20/25**: @critic should propose changes and return for rework.

### Language
If a project default output language is set, all output must be in that language. Otherwise detect from manuscript or user input.
