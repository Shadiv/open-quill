import { tool } from "@opencode-ai/plugin"

type CanonEntityKind = "character" | "location" | "unknown"

type CanonEntity = {
  kind: CanonEntityKind
  name: string
  details: string[]
}

type AttributeMatch = {
  group: string
  value: string
}

const ATTRIBUTE_PATTERNS: Record<string, Record<string, RegExp[]>> = {
  hair: {
    blonde: [/\bblond(?:e)?\b/iu, /\bfair-haired\b/iu, /\bсветловолос\p{L}*\b/iu, /\bблондин\p{L}*\b/iu],
    brunette: [/\bbrunett?e\b/iu, /\bdark-haired\b/iu, /\bт[её]мноволос\p{L}*\b/iu, /\bбрюнет\p{L}*\b/iu],
    black: [/\bblack-haired\b/iu, /\bjet-black\b/iu, /\bчерноволос\p{L}*\b/iu, /\bч[её]рн\p{L}* волосы\b/iu],
    red: [/\bred-?haired\b/iu, /\bginger\b/iu, /\bрыж\p{L}*\b/iu],
    gray: [/\bgray-haired\b/iu, /\bgrey-haired\b/iu, /\bсед\p{L}*\b/iu],
    bald: [/\bbald\b/iu, /\bлыс\p{L}*\b/iu],
  },
  eyes: {
    blue: [/\bblue eyes?\b/iu, /\bblue-eyed\b/iu, /\bголуб\p{L}* глаза\b/iu, /\bсин\p{L}* глаза\b/iu],
    green: [/\bgreen eyes?\b/iu, /\bgreen-eyed\b/iu, /\bзел[её]н\p{L}* глаза\b/iu],
    brown: [/\bbrown eyes?\b/iu, /\bbrown-eyed\b/iu, /\bкар\p{L}* глаза\b/iu],
    gray: [/\bgray eyes?\b/iu, /\bgrey eyes?\b/iu, /\bсер\p{L}* глаза\b/iu],
  },
}

const DESCRIPTOR_STOPWORDS = new Set([
  "the",
  "and",
  "with",
  "from",
  "that",
  "this",
  "they",
  "them",
  "their",
  "have",
  "has",
  "into",
  "when",
  "where",
  "character",
  "location",
  "canon",
  "notes",
  "это",
  "этот",
  "эта",
  "эти",
  "того",
  "что",
  "она",
  "они",
  "его",
  "её",
  "ее",
  "как",
  "для",
  "при",
  "это",
])

const TRAVEL_RE = /\b(travel(?:ed|s|ing)?|went|go(?:es|ing)?|arriv(?:e|ed|es|ing)|left|leave|flew|drive|drove|rode|walked|journey(?:ed|ing)?|moved|headed|returned|came|пош[её]л|пошла|ш[её]л|шла|ехал|ехала|поехал|поехала|приехал|приехала|уш[её]л|ушла|отправил(?:ся|ась)?|добрал(?:ся|ась)?|вернул(?:ся|ась)?|прибыл|прибыла)\b/iu
const MAX_CANON_ENTITIES = 120
const MAX_DESCRIPTOR_KEYWORDS = 12
const MAX_SNIPPETS_PER_ENTITY = 6
const MAX_REPETITION_NOTES = 12
const MAX_SUSPICIOUS_NAME_GAPS = 20

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function buildNameRegex(name: string, flags = "giu"): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{M}])${escapeRegExp(name)}(?![\\p{L}\\p{M}])`, flags)
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values))
}

function parseCanonEntities(canon: string): CanonEntity[] {
  const entities = new Map<string, CanonEntity>()
  const lines = canon.split(/\r?\n/)
  let currentKind: CanonEntityKind = "unknown"
  let currentEntity: CanonEntity | null = null

  const upsertEntity = (kind: CanonEntityKind, name: string): CanonEntity => {
    const key = `${kind}:${name}`
    const existing = entities.get(key)
    if (existing) return existing

    const created: CanonEntity = { kind, name, details: [] }
    entities.set(key, created)
    return created
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (/^#\s*characters(?:\.md)?$/iu.test(line)) {
      currentKind = "character"
      currentEntity = null
      continue
    }

    if (/^#\s*locations(?:\.md)?$/iu.test(line)) {
      currentKind = "location"
      currentEntity = null
      continue
    }

    const headingMatch = line.match(/^##\s+(.+)$/u)
    if (headingMatch) {
      currentEntity = upsertEntity(currentKind, headingMatch[1].trim())
      continue
    }

    const inlineMatch = line.match(/^-\s+\*\*(.+?)\*\*:\s*(.+)$/u)
    if (inlineMatch) {
      if (currentEntity) {
        currentEntity.details.push(`${inlineMatch[1].trim()}: ${inlineMatch[2].trim()}`)
      } else {
        const entity = upsertEntity(currentKind, inlineMatch[1].trim())
        entity.details.push(inlineMatch[2].trim())
        currentEntity = entity
      }
      continue
    }

    if (currentEntity && line.startsWith("-")) {
      currentEntity.details.push(line.replace(/^-\s*/, ""))
    }
  }

  return Array.from(entities.values()).slice(0, MAX_CANON_ENTITIES)
}

function extractCapitalizedNames(text: string): string[] {
  return unique(text.match(/\b[\p{Lu}][\p{L}\p{M}'-]{2,}\b/gu) ?? []).slice(0, 200)
}

function extractDescriptorSegments(details: string[]): string[] {
  const segments: string[] = []

  for (const detail of details) {
    const quoted = Array.from(detail.matchAll(/["“”«](.+?)["“”»]/gu), (match) => match[1]?.trim()).filter(Boolean)
    segments.push(...quoted)

    const afterDash = detail.match(/[—-]\s*(.+)$/u)?.[1]?.trim()
    if (afterDash) segments.push(afterDash)

    const afterColon = detail.match(/:\s*(.+)$/u)?.[1]?.trim()
    if (afterColon) segments.push(afterColon)
  }

  return unique(segments)
}

function extractDescriptorKeywords(text: string): string[] {
  const words = text.toLowerCase().match(/[\p{L}\p{M}-]{4,}/gu) ?? []
  return unique(words.filter((word) => !DESCRIPTOR_STOPWORDS.has(word))).slice(0, MAX_DESCRIPTOR_KEYWORDS)
}

function countOccurrences(text: string, name: string): number {
  let count = 0
  for (const _match of text.matchAll(buildNameRegex(name))) {
    count += 1
  }
  return count
}

function collectSnippetsAroundName(text: string, name: string, radius: number): string[] {
  const snippets: string[] = []
  for (const match of text.matchAll(buildNameRegex(name))) {
    const index = match.index ?? -1
    if (index < 0) continue
    snippets.push(text.slice(Math.max(0, index - radius), index + name.length + radius))
    if (snippets.length >= MAX_SNIPPETS_PER_ENTITY) break
  }
  return snippets
}

function extractAttributes(text: string): AttributeMatch[] {
  const found: AttributeMatch[] = []

  for (const [group, variants] of Object.entries(ATTRIBUTE_PATTERNS)) {
    for (const [value, patterns] of Object.entries(variants)) {
      if (patterns.some((pattern) => pattern.test(text))) {
        found.push({ group, value })
      }
    }
  }

  return found
}

function extractKnownLocations(entities: CanonEntity[]): string[] {
  return entities.filter((entity) => entity.kind === "location").map((entity) => entity.name)
}

function extractLocationsFromText(text: string, knownLocations: string[]): string[] {
  return knownLocations.filter((location) => buildNameRegex(location, "iu").test(text))
}

function extractCanonicalLocation(details: string[], knownLocations: string[]): string | null {
  const text = details.join("\n")
  for (const location of knownLocations) {
    const locationPattern = new RegExp(
      `(?:\\bat\\b|\\bin\\b|\\bto\\b|\\bfrom\\b|\\bв\\b|\\bво\\b|\\bна\\b|\\bиз\\b|\\bк\\b)\\s+${escapeRegExp(location)}`,
      "iu",
    )

    if (locationPattern.test(text) || buildNameRegex(location, "iu").test(text)) {
      return location
    }
  }

  return null
}

function sentenceContainsEntityAndPattern(sentences: string[], entityName: string, pattern: RegExp): boolean {
  return sentences.some((sentence) => buildNameRegex(entityName, "iu").test(sentence) && pattern.test(sentence))
}

function extractTimelineIssues(details: string[], chapterSentences: string[], entityName: string): string[] {
  const detailText = details.join(" ")
  const issues: string[] = []

  const timelineChecks = [
    {
      canon: /\b(before dawn|at dawn|sunrise|утром|на рассвете)\b/iu,
      chapter: /\b(after sunset|at night|ночью|вечером)\b/iu,
      message: `${entityName} canon suggests an early-morning context, but chapter context reads as night/evening.`,
    },
    {
      canon: /\b(after sunset|at night|ночью|вечером)\b/iu,
      chapter: /\b(before dawn|at dawn|sunrise|утром|на рассвете)\b/iu,
      message: `${entityName} canon suggests a night/evening context, but chapter context reads as early morning.`,
    },
  ]

  for (const check of timelineChecks) {
    if (check.canon.test(detailText) && sentenceContainsEntityAndPattern(chapterSentences, entityName, check.chapter)) {
      issues.push(check.message)
    }
  }

  return issues
}

export const continuityCheckTool = tool({
  description:
    "Heuristic continuity check for a chapter against canon notes. Detects: name presence gaps, potential timeline issues (basic), and repeated entity mentions. For deep continuity analysis, delegate to the critic agent.",
  args: {
    chapter: tool.schema.string().describe("Chapter text"),
    canon: tool.schema.string().optional().describe("Canon notes (characters/locations/timeline/etc)"),
  },
  async execute(args) {
    const chapter = args.chapter
    const canonText = args.canon
    const chapterLower = chapter.toLowerCase()
    const chapterSentences = chapter.split(/(?<=[.!?。！？])\s+/u)
    const namePresenceIssues: string[] = []
    const descriptionIssues: string[] = []
    const locationIssues: string[] = []
    const timelineIssues: string[] = []
    const repetitionNotes: string[] = []

    if (!canonText) {
      namePresenceIssues.push("No canon provided; heuristic checks are limited.")
    } else {
      const entities = parseCanonEntities(canonText)
      const parsedNames = new Set(entities.map((entity) => entity.name))
      const fallbackNames = extractCapitalizedNames(canonText).filter((name) => !parsedNames.has(name))
      const knownLocations = extractKnownLocations(entities)

      const scopedEntities = entities
        .concat(fallbackNames.map((name) => ({ kind: "unknown" as const, name, details: [] })))
        .slice(0, MAX_CANON_ENTITIES)

      for (const entity of scopedEntities) {
        const mentionCount = countOccurrences(chapter, entity.name)
        const descriptorSegments = extractDescriptorSegments(entity.details)
        const descriptorKeywords = extractDescriptorKeywords(descriptorSegments.join(" "))
        const descriptorHits = descriptorKeywords.filter((keyword) => chapterLower.includes(keyword))

        if (mentionCount === 0) {
          if (descriptorHits.length >= 2 && namePresenceIssues.length < MAX_SUSPICIOUS_NAME_GAPS) {
            namePresenceIssues.push(
              `${entity.kind === "character" ? "Character" : "Canon entry"} \"${entity.name}\" is not named in the chapter, but descriptor keywords (${descriptorHits
                .slice(0, 4)
                .join(", ")}) appear — possible indirect or wrong-name reference.`,
            )
          }
        }

        if (mentionCount >= 4 && repetitionNotes.length < MAX_REPETITION_NOTES) {
          repetitionNotes.push(`\"${entity.name}\" appears ${mentionCount} times in the chapter.`)
        }

        if (entity.kind === "character" && mentionCount > 0) {
          const canonAttributes = extractAttributes(descriptorSegments.join(" "))
          const entitySnippets = collectSnippetsAroundName(chapter, entity.name, 180)
          const chapterAttributes = extractAttributes(entitySnippets.join("\n"))

          for (const canonAttribute of canonAttributes) {
            const conflictingChapterAttribute = chapterAttributes.find(
              (chapterAttribute) =>
                chapterAttribute.group === canonAttribute.group && chapterAttribute.value !== canonAttribute.value,
            )

            if (conflictingChapterAttribute) {
              descriptionIssues.push(
                `${entity.name} canon suggests ${canonAttribute.group}=${canonAttribute.value}, but chapter context suggests ${conflictingChapterAttribute.group}=${conflictingChapterAttribute.value}.`,
              )
            }
          }

          const canonicalLocation = extractCanonicalLocation(entity.details, knownLocations)
          if (canonicalLocation) {
            const chapterLocations = unique(
              entitySnippets.flatMap((snippet) => extractLocationsFromText(snippet, knownLocations)).filter((location) => location !== canonicalLocation),
            )

            const hasLocalTravelCue = entitySnippets.some((snippet) => TRAVEL_RE.test(snippet))
            if (chapterLocations.length && !hasLocalTravelCue) {
              locationIssues.push(
                `${entity.name} is associated with ${canonicalLocation} in canon, but chapter context places them near ${chapterLocations
                  .slice(0, 3)
                  .join(", ")} without an obvious travel cue.`,
              )
            }
          }

          timelineIssues.push(...extractTimelineIssues(entity.details, chapterSentences, entity.name))
        }
      }
    }

    return [
      "## Continuity Check (heuristic v2)",
      "",
      "### Name Presence",
      ...(namePresenceIssues.length ? namePresenceIssues.map((issue) => `- ${issue}`) : ["- All referenced canon names are present."]),
      "",
      "### Description Consistency",
      ...(descriptionIssues.length
        ? descriptionIssues.map((issue) => `- ⚠️ ${issue}`)
        : ["- No obvious description contradictions found."]),
      "",
      "### Location Continuity",
      ...(locationIssues.length
        ? locationIssues.map((issue) => `- ⚠️ ${issue}`)
        : ["- No obvious location continuity conflicts found."]),
      "",
      "### Timeline Signals",
      ...(timelineIssues.length
        ? unique(timelineIssues).map((issue) => `- ⚠️ ${issue}`)
        : ["- No obvious timeline sequencing conflicts found."]),
      "",
      "### Repeated Entity Mentions",
      ...(repetitionNotes.length
        ? repetitionNotes.map((note) => `- ${note}`)
        : ["- No heavily repeated canon entities detected."]),
      "",
      "### Notes",
      "- This tool performs heuristic checks only. Use the critic agent for deep continuity analysis.",
      "- False positives are expected — review flagged issues before acting on them.",
      "- Location and timeline checks are supplementary quick-pass signals, not authoritative canon validation.",
    ].join("\n")
  },
})
