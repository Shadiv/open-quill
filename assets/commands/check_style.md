---
description: Check prose against the project style profile and forbidden patterns
agent: writer
---

## Delegation target: @style_checker

The user wants a style check on their prose. Delegate to **@style_checker** with the following instructions.

### Delegation instructions

1. **Pass the target**: Forward `$ARGUMENTS` to @style_checker as the file/section reference or pasted text to check.
2. **Ensure style profile exists**: @style_checker MUST read `openquill/style_profile.md` first. If it's missing, delegate to @stylematcher to build one from existing manuscript samples before continuing — do NOT attempt a check without a profile.
3. **Ensure text is read**: @style_checker should use `read_manuscript_chunk` to read the target text (REQUIRED for `.docx` — the built-in read tool will fail).
4. **Style audit**: @style_checker should:
   - Compare text against `openquill/style_profile.md` AND the forbidden-pattern list in its system prompt.
   - For every pattern hit, quote the offending excerpt and name the pattern.
   - Produce the QUALITY CHECK score table (1–5 per dimension with concrete excerpt justification):
     - Sentence rhythm
     - Description patterns
     - Respect for reader intelligence
     - Obvious / over-explained statements
     - Compressed character sketch usage
   - Sum the scores. If total < 20/25, list concrete pattern hits and propose rewrites that match the profile.
5. **Preserve manuscript language** and register in any rewrite suggestions.

### Language
If a project default output language is set, all output must be in that language. Otherwise detect from manuscript or user input.
