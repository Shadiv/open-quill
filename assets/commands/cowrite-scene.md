---
description: Draft a scene from an approved outline
agent: writer
---

## Delegation target: @cowriter

The user wants to draft a scene. Delegate to **@cowriter** with the following instructions.

### Delegation instructions

1. **Pass the outline/arguments**: Forward `$ARGUMENTS` to @cowriter as the scene specification (outline, beats, or chapter description).
2. **Pass style context**: Ensure @cowriter reads `style_profile.md` before drafting. If missing, call @stylematcher first to build it.
3. **Pass canon context**: Ensure @cowriter reads relevant canon files — `characters.md` for characters in the scene, `locations.md` for setting, `world_rules.md` for any rules that apply.
4. **Pass manuscript context**: Ensure @cowriter reads the most recent chapter or scene before this one using `read_manuscript_chunk` — to match tone, rhythm, and voice.
5. **Enforce quality loop**: @cowriter MUST run the DRAFTING CONTRACT (style gate via @style_checker ≥ 20/25, critique gate via @critic ≥ 20/25) and end with the scoreboard: `Style: <total>/25 · Critique: <total>/25 · <N> cycles`
6. **Hard cap**: 5 full critique→style cycles. If not converging, present best draft with remaining concerns.

### Language
If a project default output language is set, all output must be in that language. Otherwise detect from manuscript or user input. Preserve manuscript language and register in the drafted prose.
