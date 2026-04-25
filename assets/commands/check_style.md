---
description: Check prose against the project style profile and forbidden patterns
agent: style_checker
subtask: true
---
Check the text the user provides (or the file/section referenced in $ARGUMENTS) against the project style profile and the forbidden-pattern list.

1. Locate `style_profile.md` in the project root. If it's missing, delegate to `@stylematcher` to build one from existing manuscript samples before continuing — do not attempt a check without a profile.
2. Use `read_manuscript_chunk` to read the target text (REQUIRED for `.docx` — the built-in read tool will fail on them).
3. Compare the text against `style_profile.md` AND the forbidden-pattern list in your system prompt. For every hit, quote the offending excerpt and name the pattern (e.g. "Double framing", "Compressed character sketch").
4. Produce the QUALITY CHECK score table — 1–5 per dimension, with a one-line justification grounded in a concrete excerpt:
   - Sentence rhythm
   - Description patterns
   - Respect for reader intelligence
   - Obvious / over-explained statements
   - Compressed character sketch usage
5. Sum the scores. If total < 20 (80% of 25), list concrete pattern hits and propose rewrites that match the profile. Return the text for rework rather than approving it.
6. Preserve manuscript language and register in any rewrite suggestions.
