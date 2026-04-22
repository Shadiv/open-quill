# Open Quill

Open Quill is an [OpenCode](https://opencode.ai) plugin that turns your coding assistant into a full-featured writing partner. It installs writing-focused agents, slash commands, and custom tools designed for fiction and non-fiction workflows.

## Features

**Specialized agents** — each with a distinct role:

| Agent | Role |
|-------|------|
| `writer` | Primary agent: drafting, brainstorming, scene work. Delegates to other agents as needed. |
| `editor` | Conservative reviser: minimal surgical edits with before/after reasoning. |
| `cowriter` | Drafts scenes and chapters from an approved plan. |
| `critic` | Delivers honest, objective critique — no sugarcoating. |
| `plotter` | Structural analyst: beat sheets, arc planning, alternatives with tradeoffs. |
| `summarizer` | Extracts plot summaries, chapter breakdowns, character status, open threads. |
| `lorekeeper` | Maintains canon files (characters, locations, timeline, glossary, world rules). |
| `stylematcher` | Analyzes prose style and produces quantified style profiles to preserve voice. |

**Slash commands** for common workflows:

| Command | What it does |
|---------|-------------|
| `/story-prime` | Primes a project: summarizes story state, extracts canon, creates all project docs. |
| `/cowrite-scene` | Drafts a scene from an approved outline. |
| `/critique-chapter` | Full critique: issues by severity, continuity risks, rewrite suggestions. |
| `/edit-selection` | Conservative edit of selected text with before/after comparison. |
| `/plan-next` | Proposes 3-5 options for the next chapter/scene with beat lists. |
| `/continuity-check` | Checks chapter text against canon for contradictions. |
| `/refresh-canon` | Updates canon files from the latest manuscript. |
| `/summarize-project` | Creates a concise manuscript summary with chapter bullets and open threads. |
| `/writing-lang` | Sets the per-project default output language (e.g., `/writing-lang ru`). |

**Tools** available to agents:

- `build_style_profile` — deterministic text analysis (sentence length, dialogue ratio, vocabulary richness, POV, tense detection). Works with both English and Russian text.
- `extract_canon` — extracts structured facts from prose.
- `canon_merge` / `canon_snapshot` — maintains and renders the canon database.
- `scan_manuscripts` / `read_manuscript_chunk` — navigates large manuscripts in chunks.
- `prose_diff` — summarizes editing changes.
- `continuity_check` — verifies consistency against canon.
- `set_project_language` — persists language preference per project.

## Install

> **Runtime**: Bun, via [opencode](https://opencode.ai). Open Quill uses `Bun.file` and `Bun.env` at runtime, so it runs only inside the opencode host (which is Bun-based) — it is not intended to be imported from a plain Node.js process.

1. Install the plugin:

```bash
npm install open-quill
```

2. Enable it in your `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["open-quill", { "installMode": "owned-only" }]]
}
```

On startup, Open Quill installs agents into `~/.config/opencode/agents/` and commands into `~/.config/opencode/commands/` (Windows: `%USERPROFILE%\.config\opencode`).

### Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `installMode` | `"owned-only"` `"if-missing"` `"force"` | `"owned-only"` | How to handle existing files. `owned-only` updates only files managed by Open Quill; `if-missing` never overwrites; `force` overwrites everything. |
| `backup` | `"on-force"` `"always"` `"never"` | `"on-force"` | When to create `.bak` backups before overwriting. |
| `defaultLanguage` | any language code | — | Default output language for all projects (overridable per-project with `/writing-lang`). |

## Usage

1. Switch to the `writer` or `editor` agent in OpenCode.
2. Start a conversation — describe your project, ask for a scene draft, request a critique.
3. Use slash commands for structured workflows: `/story-prime` to bootstrap a project, `/critique-chapter` for review, `/plan-next` for brainstorming.
4. Set your preferred language: `/writing-lang ru` for Russian, `/writing-lang en` for English.

## Language Support

All agents understand and work with both **English** and **Russian** text. The `build_style_profile` tool handles Cyrillic tokenization, Russian dialogue conventions (dash-prefixed lines: `— Привет!`), and Russian stopword filtering. Set a project-level default language to keep all agent responses in your preferred language.

## License

MIT

---

# Open Quill (Русская версия)

Open Quill — плагин для [OpenCode](https://opencode.ai), который превращает среду разработки в полноценного помощника для авторов. Он устанавливает специализированных агентов, слеш-команды и инструменты, предназначенные для работы над художественной и нехудожественной литературой.

## Возможности

**Специализированные агенты** — каждый со своей ролью:

| Агент | Роль |
|-------|------|
| `writer` | Основной агент: черновики, мозговой штурм, работа над сценами. Делегирует другим агентам по необходимости. |
| `editor` | Консервативный редактор: минимальные точечные правки с обоснованием. |
| `cowriter` | Пишет сцены и главы по утверждённому плану. |
| `critic` | Прямая, объективная критика — без приукрашивания. |
| `plotter` | Структурный аналитик: побитовые планы, арки, варианты с компромиссами. |
| `summarizer` | Краткое содержание глав, статус персонажей, нерешённые сюжетные линии. |
| `lorekeeper` | Ведёт файлы канона (персонажи, локации, хронология, глоссарий, правила мира). |
| `stylematcher` | Анализирует стиль прозы и создаёт количественный профиль стиля для сохранения авторского голоса. |

**Слеш-команды** для типовых сценариев работы:

| Команда | Описание |
|---------|----------|
| `/story-prime` | Инициализация проекта: сводка сюжета, извлечение канона, создание всех документов. |
| `/cowrite-scene` | Черновик сцены по утверждённому плану. |
| `/critique-chapter` | Полная критика главы: проблемы по серьёзности, риски непрерывности, предложения. |
| `/edit-selection` | Консервативная правка выделенного текста с до/после. |
| `/plan-next` | 3-5 вариантов следующей главы/сцены с побитовыми планами. |
| `/continuity-check` | Проверка текста главы на противоречия с каноном. |
| `/refresh-canon` | Обновление файлов канона по последней версии рукописи. |
| `/summarize-project` | Краткая сводка рукописи с пулями по главам и открытыми вопросами. |
| `/writing-lang` | Установка языка вывода для проекта (например, `/writing-lang ru`). |

**Инструменты**, доступные агентам:

- `build_style_profile` — детерминистический анализ текста (длина предложений, доля диалогов, богатство лексики, определение POV и времени). Работает с английским и русским текстом.
- `extract_canon` — извлечение структурированных фактов из прозы.
- `canon_merge` / `canon_snapshot` — ведение и рендеринг базы канона.
- `scan_manuscripts` / `read_manuscript_chunk` — навигация по большим рукописям по частям.
- `prose_diff` — сводка редакторских изменений.
- `continuity_check` — проверка согласованности с каноном.
- `set_project_language` — сохранение языковых предпочтений для проекта.

## Установка

> **Среда выполнения**: Bun, через [opencode](https://opencode.ai). Open Quill использует `Bun.file` и `Bun.env` во время выполнения, поэтому работает только внутри хоста opencode (основанного на Bun) — импортировать его из обычного Node.js-процесса не предполагается.

1. Установите плагин:

```bash
npm install open-quill
```

2. Включите его в `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["open-quill", { "installMode": "owned-only" }]]
}
```

При запуске Open Quill устанавливает агентов в `~/.config/opencode/agents/` и команды в `~/.config/opencode/commands/` (Windows: `%USERPROFILE%\.config\opencode`).

### Параметры

| Параметр | Значения | По умолчанию | Описание |
|----------|----------|-------------|----------|
| `installMode` | `"owned-only"` `"if-missing"` `"force"` | `"owned-only"` | Управление существующими файлами. `owned-only` обновляет только файлы Open Quill; `if-missing` никогда не перезаписывает; `force` перезаписывает всё. |
| `backup` | `"on-force"` `"always"` `"never"` | `"on-force"` | Когда создавать `.bak`-копии перед перезаписью. |
| `defaultLanguage` | любой код языка | — | Язык вывода по умолчанию (переопределяется для конкретного проекта через `/writing-lang`). |

## Использование

1. Переключитесь на агента `writer` или `editor` в OpenCode.
2. Начните разговор — опишите проект, попросите черновик сцены, запросите критику.
3. Используйте слеш-команды: `/story-prime` для инициализации проекта, `/critique-chapter` для рецензии, `/plan-next` для планирования.
4. Задайте предпочтительный язык: `/writing-lang ru`.

## Поддержка языков

Все агенты понимают и работают как с **английским**, так и с **русским** текстом. Инструмент `build_style_profile` корректно обрабатывает кириллическую токенизацию, русские диалоговые конвенции (строки с тире: `— Привет!`) и русские стоп-слова. Установите язык по умолчанию для проекта, чтобы все ответы агентов были на нужном языке.

## Лицензия

MIT
