# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.4] - 2026-04-25

### Fixed

- Plugin no longer deadlocks the opencode host on startup. The bootstrap
  previously awaited `client.tui.showToast` and `client.app.log` *before*
  returning hooks; the host serves those endpoints from a TUI consumer that
  only starts after plugin loading completes, so the awaited HTTP calls
  hung forever and opencode never finished launching. Templates now install
  in the background and toasts are fire-and-forget.

## [0.1.3] - 2026-04-25

### Fixed

- Published tarball now ships `dist/index.d.ts`. The previous `prepare` script
  ran a Bun build that overwrote tsup's output (which generates type
  declarations) during `npm publish`, leaving consumers without types. The
  redundant Bun build pipeline was removed; `tsup` is the sole build.
- Smoke script (`scripts/smoke.mjs`) now imports `dist/index.js` via a
  `file://` URL so it works on Node 24+ on Windows.

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
