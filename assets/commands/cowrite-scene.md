---
description: Draft a scene from an approved outline
agent: cowriter
subtask: true
---
Draft the scene using the outline or beats provided in $ARGUMENTS.

## Before drafting
1. Read `style_profile.md`. If missing, call `@stylematcher` to build it before continuing.
2. Read relevant canon files: `characters.md` (for characters in the scene), `locations.md` (for setting), `world_rules.md` (for any rules that apply).
3. Read the most recent chapter or scene before this one using `read_manuscript_chunk` — match tone, rhythm, and voice.

## Drafting
1. Write the scene following the approved outline.
2. Match the author's style from `style_profile.md`: sentence rhythm, paragraph density, dialogue style, vocabulary level, POV, tense.
3. Preserve the manuscript language and register exactly.

## Quality gates
After drafting, run the iterative quality loop per your DRAFTING CONTRACT:
- Call `@style_checker` → must score ≥ 20/25
- Call `@critic` → must score ≥ 20/25
- Hard cap: 5 cycles. If not converging, present best draft with remaining concerns.

## Output
End with the scoreboard: `Style: <total>/25 · Critique: <total>/25 · <N> cycles`
