---
description: Critique a chapter (quality + continuity)
agent: critic
subtask: true
---
Critique the chapter provided (or referenced in $ARGUMENTS).

## Context loading
1. Use `scan_manuscripts` to locate the chapter file.
2. Read the chapter using `read_manuscript_chunk` (REQUIRED for `.docx` files).
3. Read canon files: `characters.md`, `locations.md`, `timeline.md`, `world_rules.md`, `continuity_watchlist.md`.
4. If `style_profile.md` exists, read it for voice/style assessment.
5. Run `continuity_check` tool with the chapter text and canon notes as an initial pass.

## Critique delivery
1. **Issues by severity** — CRITICAL (canon contradiction, logic break), MAJOR (weakens scene), MINOR (polish), NOTE (observation).
2. **Continuity risks** — Flag any contradictions with canon: timeline errors, character state inconsistencies, location errors, world rule violations.
3. **Rewrite suggestions** — For every CRITICAL and MAJOR issue, provide a concrete rewrite suggestion that addresses the problem.

## Quality check
Score (1-5) per dimension with one-line justification grounded in a concrete excerpt:
1. Plot coherence
2. Character consistency
3. Continuity / canon
4. Pacing & structure
5. Emotional / thematic resonance

End with: `Critique: <total>/25 — Plot:X Char:X Cont:X Pace:X Reson:X`
If total < 20 → propose changes and return for rework.
