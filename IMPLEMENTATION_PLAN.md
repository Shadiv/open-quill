# Open Quill (OpenCode Writing Plugin) Implementation Plan

## Goal
Ship an OpenCode plugin (installable from npm from this repo) that enables a “writing pack” experience by simply enabling the plugin in `opencode.json`.

“Writing pack” means:
1. Writing-focused agents users can switch to in the OpenCode UI (primary: writer, editor; subagents: summarizer, lorekeeper, plotter, cowriter, critic; optional: stylematcher).
2. Reusable slash commands for common writing workflows.
3. Custom tools for structured operations (canon extraction, continuity checks, prose diff, style profiling).
4. Automation hooks for light persistence, stale-state hints, and compaction carry-forward context.
5. Russian support: all agents must work naturally with Russian inputs and should respond in the user’s language by default.

## Non-Goals
1. No separate “config pack repo”. This repo is the package.
2. No requirement for users to set `OPENCODE_CONFIG_DIR`.
3. No hard dependency on external services for v1 (everything local).
4. No attempt to fully manage or delete user files on uninstall.

## Key OpenCode Constraints (Docs-Aligned)
1. OpenCode loads agents and commands from config directories like `~/.config/opencode/{agents,commands}/` and `.opencode/{agents,commands}/`.
2. Plugins can be loaded from npm via `opencode.json` `plugin: [...]` and are installed by Bun at startup.
3. Plugins can register custom tools directly (no need for `.opencode/tools/*` files).
4. Plugins cannot “register agents/commands” purely in-memory; to make agents/commands appear in UI, they must exist as files in the config directories.
5. Therefore, this plugin must “bootstrap” (install) agent and command markdown files into the user’s config directory.

## Distribution Model
1. Publish this package to npm (target name: `open-quill` if available, else `@open-quill/opencode-writing`).
2. User enables it by adding to `opencode.json`:
   - `"plugin": ["open-quill"]` (or fallback name).
3. On first run (or update), the plugin copies Open Quill’s agent and command markdown templates into:
   - `~/.config/opencode/agents/`
   - `~/.config/opencode/commands/`
4. The plugin also registers custom tools at runtime.

## Installation Target (Decision)
Use the global config directory (not project `.opencode`) to avoid touching user repos and to make the pack available across projects.

## Naming (Decision)
Use generic names for convenience:
- Agents: `writer`, `editor`, `summarizer`, `lorekeeper`, `plotter`, `cowriter`, `critic`, `stylematcher` (optional).
- Commands: `/story-prime`, `/summarize-project`, `/edit-selection`, `/refresh-canon`, `/plan-next`, `/cowrite-scene`, `/critique-chapter`, `/continuity-check`.

Risk: collisions with existing user agents/commands. Mitigation: installer is non-destructive by default and refuses to overwrite user-defined files unless they are clearly “owned” by Open Quill.

## Language Support (Russian)
Policy embedded in every agent prompt:
1. Understand and analyze both English and Russian text.
2. Default output language: match the user’s language in the current conversation.
3. When editing text, preserve the manuscript’s language and register.
4. If user explicitly requests a different output language, follow it.

Optional later enhancement (not required for v1):
- A `/writing-lang` command that stores a per-session preference and injects it via compaction hooks.

## Repo Structure (Planned)
1. `src/`
2. `src/plugin.ts` (main plugin entry)
3. `src/tools/*` (tool implementations, used by plugin registration)
4. `assets/agents/*.md` (agent templates to install)
5. `assets/commands/*.md` (command templates to install)
6. `dist/` (built JS output)
7. `package.json`, `tsconfig.json`
8. `README.md` (install instructions and usage)

## Plugin Responsibilities
### 1. Bootstrap installer
On plugin init:
1. Detect global config directory:
   - Prefer `$XDG_CONFIG_HOME/opencode`
   - Else use `~/.config/opencode`
   - On Windows (non-WSL), fall back to `%APPDATA%/opencode` if present, else `~/.config/opencode`.
2. Ensure directories exist:
   - `<config>/agents`
   - `<config>/commands`
3. Copy templates from `assets/` into those directories, but with safe overwrite rules:
   - If the target file does not exist: write it.
   - If it exists and contains an Open Quill ownership header: update it.
   - If it exists and does not contain ownership header: do not overwrite, log and (if possible) show a toast.
4. Write/update a plugin-managed manifest file:
   - `<config>/.open-quill/manifest.json` containing installed version and list of files installed.

### 2. Register custom tools (runtime)
Register tools via the plugin `tool` hook (examples):
1. `extract_canon`
2. `continuity_check`
3. `prose_diff`
4. `build_style_profile`

Tool design:
1. Narrow input schemas with Zod.
2. Deterministic outputs where possible (JSON strings or structured markdown).
3. Pure local file operations (read-only unless explicitly needed).
4. Do not attempt to call OpenCode built-in tools from inside tools; tools use filesystem APIs directly.

### 3. Automation hooks
1. `experimental.session.compacting`:
   - Inject “carry-forward” context (current writing workflow expectations, pointer to canon/memory files, language policy).
2. Optional v1-lite stale hints:
   - If feasible without unreliable file watchers, provide a command `/refresh-canon` that explicitly recomputes canon rather than trying to auto-detect changes.
   - If we add change detection later, we’ll do it via plugin events and write minimal state files in the user’s config directory, not in project repos.

## Agents (Template Content)
All agent markdown files include frontmatter:
1. `description`
2. `mode: primary` for `writer` and `editor`
3. `mode: subagent` for subagents
4. Conservative permissions:
   - Writer/editor: `edit: ask`, `bash: deny` by default (users can override in their config).
   - Summarizer/critic/plotter: `edit: deny`, `bash: deny`.
   - Lorekeeper: default `edit: ask` but instructed to only modify canon files.
5. Language policy: bilingual + match user language.

Agent responsibilities:
1. `writer` (primary): drafting, brainstorming, scene writing, can delegate to subagents.
2. `editor` (primary): line edits, clarity, style consistency, uses `prose_diff` output for change summaries.
3. `summarizer` (subagent): summaries for chapters/manuscripts.
4. `lorekeeper` (subagent): maintains canon files (characters/locations/timeline/glossary).
5. `plotter` (subagent): planning beats and arcs.
6. `cowriter` (subagent): executes an approved outline into prose.
7. `critic` (subagent): critique and QA, flags continuity issues.
8. `stylematcher` (optional subagent): extracts style and applies it.

## Commands (Template Content)
Commands are markdown files with frontmatter + body.
Initial set (v1):
1. `/story-prime`
2. `/summarize-project`
3. `/edit-selection`
4. `/refresh-canon`
5. `/plan-next`
6. `/cowrite-scene`
7. `/critique-chapter`
8. `/continuity-check`

Each command:
1. States inputs expected (files/folders, chapter selection, etc).
2. References the appropriate agent (frontmatter `agent: writer` etc).
3. Uses built-in file references (`@path`) and optional shell output injection (`!`backticks) sparingly.
4. Explicitly calls custom tools by name when structured output is required.

## Canon / Memory Surface (Recommended Files)
Open Quill should standardize a small set of markdown “memory” files in the user’s project (created on demand by agents, not by the plugin automatically):
1. `project_brief.md`
2. `summary.md`
3. `glossary.md`
4. `characters.md`
5. `locations.md`
6. `timeline.md`
7. `style_profile.md` (optional)
8. `continuity_watchlist.md` (optional)

Policy:
1. Agents create/update these files only when the user runs writing commands or explicitly asks.
2. Keep the format human-editable and stable.

## Implementation Steps (Backlog)
### Milestone 1: Plugin scaffolding and safe bootstrap
1. Create npm package scaffolding (`package.json`, `tsconfig.json`, build script).
2. Implement plugin entrypoint exporting a `server` plugin function.
3. Implement bootstrap copier:
   - config directory detection
   - non-destructive install rules
   - manifest tracking
4. Add minimal agent templates: writer, editor, summarizer, lorekeeper.
5. Add minimal commands: story-prime, summarize-project, edit-selection.

Acceptance:
1. Enabling plugin results in those agents/commands appearing in OpenCode.
2. No overwrites of user files unless owned by Open Quill.

### Milestone 2: Tools and writing workflows
1. Register `extract_canon` and `prose_diff` tools.
2. Wire commands and agent prompts to use those tools.
3. Add additional agents: plotter, cowriter, critic (and optionally stylematcher).
4. Add additional commands: refresh-canon, plan-next, cowrite-scene, critique-chapter, continuity-check.
5. Add `continuity_check` tool (and optionally `build_style_profile`).

Acceptance:
1. End-to-end workflow works on a sample manuscript folder.
2. Editor produces change summaries; lorekeeper updates canon; critic flags continuity risks.

### Milestone 3: Compaction support and UX polish
1. Implement `experimental.session.compacting` hook:
   - preserve language policy
   - preserve which writing workflow is active
   - preserve pointers to canon/memory files
2. Add toast/logging for install/update outcomes.
3. Document in README:
   - enabling plugin
   - how to switch to agents
   - recommended workflow commands
   - RU language behavior (auto by default)

Acceptance:
1. Long sessions compact without losing writing context.
2. Users understand how to operate the pack quickly.

## Verification Plan
1. Local dev:
   - `npm pack` or `npm install` local path in a scratch environment.
   - Enable plugin in `opencode.json`.
   - Confirm agents and commands appear.
2. Runtime:
   - Run `/story-prime` on a small folder.
   - Run `/edit-selection` on a paragraph in English and Russian.
   - Confirm output language matches the user.
3. Safety:
   - Ensure existing user `writer.md` is not overwritten unless owned by Open Quill.
   - Ensure plugin does not write into project repos by default.

## Open Questions / Future Enhancements
1. Add optional `/writing-lang` command and per-session preference storage.
2. Add optional “prefixed naming mode” via plugin options if collisions are common.
3. Add deeper stale detection (only if reliable across platforms).
