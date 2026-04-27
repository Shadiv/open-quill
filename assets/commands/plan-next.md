---
description: Plan the next chapter/scene options
agent: plotter
subtask: true
---
Based on the current story state (and any provided context: $ARGUMENTS), propose 3-5 next-step options.

## Context gathering
1. Use `scan_manuscripts` to locate manuscript files.
2. Read the most recent chapter(s) using `read_manuscript_chunk` to understand current story state.
3. Read canon files: `characters.md`, `timeline.md`, `world_rules.md`, `continuity_watchlist.md`.
4. Read `summary.md` if available for overall story state.
5. Read `plot.md` if available for existing plans.

## Planning
For each option provide:
- **Beat list** — scene-by-scene breakdown with purpose for each beat
- **Purpose** — what this chapter/scene accomplishes in the larger arc
- **Character arcs** — how each option affects character development
- **Risks** — continuity concerns, pacing issues, arc conflicts
- **Continuity checks** — specific canon entries that must be respected
- **Tradeoffs** — what each option enables vs. forecloses for future chapters

Save the selected plan to `plot.md` (ask before overwriting). If `plot.md` exists, update incrementally.

Always present multiple options with tradeoff analysis. The author decides.
