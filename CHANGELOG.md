# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-04-22

### Added

- Initial public release.
- Eight writing-focused agents: `writer`, `editor`, `cowriter`, `critic`,
  `plotter`, `summarizer`, `lorekeeper`, `stylematcher`.
- Nine slash commands: `/story-prime`, `/cowrite-scene`, `/critique-chapter`,
  `/edit-selection`, `/plan-next`, `/continuity-check`, `/refresh-canon`,
  `/summarize-project`, `/writing-lang`.
- Custom tools: `build_style_profile`, `extract_canon`, `canon_merge`,
  `canon_snapshot`, `scan_manuscripts`, `read_manuscript_chunk`, `prose_diff`,
  `continuity_check`, `set_project_language`.
- English + Russian language support in agents, commands, and
  `build_style_profile` (Cyrillic tokenization, dash-prefixed dialogue
  detection, Russian stopword filter).
- Per-project default output language persisted via `/writing-lang` and
  enforced through the `experimental.chat.system.transform` hook.
- Install modes: `owned-only` (default), `if-missing`, `force`, with optional
  `.bak` backups on overwrite.

### Fixed

- Bundled asset path resolution: `dist/assets/` is now shipped alongside the
  bundled entry point, so the plugin locates its agents and commands after
  being installed from the npm registry.
