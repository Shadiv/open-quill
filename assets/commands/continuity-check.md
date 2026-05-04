---
description: Run continuity check against canon notes
agent: writer
---

## Delegation target: @critic

The user wants a continuity check. Delegate to **@critic** with the following instructions.

### Delegation instructions

1. **Pass the target**: Forward `$ARGUMENTS` to @critic as the chapter text or file reference to check.
2. **Ensure canon loading**: @critic should:
   - If canon files exist (`characters.md`, `locations.md`, `timeline.md`, `world_rules.md`), read them.
   - If no canon files exist, ask the user for the canon source.
   - Use `canon_snapshot` to obtain current canon markdown and the continuity watchlist for large projects.
3. **Run the check**: @critic should use `continuity_check` with the chapter text and canon notes, then perform deeper LLM-based cross-checking for timeline contradictions, character state inconsistencies, location errors, and world rule violations.
4. **Report**: Flag all contradictions with severity (CRITICAL/MAJOR/MINOR) and source references.

### Language
If a project default output language is set, all output must be in that language. Otherwise detect from manuscript or user input.
