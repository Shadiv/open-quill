---
description: Plan the next chapter/scene options
agent: writer
---

## Delegation target: @plotter

The user wants to plan next steps for the story. Delegate to **@plotter** with the following instructions.

### Delegation instructions

1. **Pass context**: Forward `$ARGUMENTS` to @plotter as any additional context or constraints for planning.
2. **Ensure context loading**: @plotter should:
   - Use `scan_manuscripts` to locate manuscript files.
   - Read the most recent chapter(s) using `read_manuscript_chunk` to understand current story state.
   - Read canon files: `characters.md`, `timeline.md`, `world_rules.md`, `continuity_watchlist.md`.
   - Read `summary.md` if available for overall story state.
   - Read `plot.md` if available for existing plans.
3. **Enforce planning format**: @plotter MUST provide 3–5 options, each with:
   - Beat list (scene-by-scene breakdown with purpose)
   - Purpose (what this chapter/scene accomplishes in the larger arc)
   - Character arcs (how each option affects character development)
   - Risks (continuity concerns, pacing issues, arc conflicts)
   - Continuity checks (specific canon entries that must be respected)
   - Tradeoffs (what each option enables vs. forecloses)
4. **Save the plan**: After the user selects an option, @plotter saves it to `plot.md` (ask before overwriting). If `plot.md` exists, update incrementally.

### Language
If a project default output language is set, all output must be in that language. Otherwise detect from manuscript or user input.
