import { tool } from "@opencode-ai/plugin"
import fg from "fast-glob"
import path from "node:path"
import mammoth from "mammoth"

import { readText, fileExists } from "../util/fs.js"
import { DEFAULT_IGNORE_GLOBS, isProbablyBinary } from "../util/scan.js"

type Canon = {
  characters: string[]
  locations: string[]
  timeline: string[]
  rules: string[]
  threads: string[]
  notes: string[]
}

type CapitalizedMatch = {
  name: string
  index: number
}

type CandidateWithFrequency = {
  name: string
  count: number
}

type CandidateStats = CandidateWithFrequency & {
  dialogueHits: number
  locationHits: number
}

type TokenAnalysis = {
  totalMatches: number
  candidates: CandidateStats[]
}

async function readDocxText(filePath: string) {
  const res = await mammoth.extractRawText({ path: filePath })
  return res.value ?? ""
}

const CAPITALIZED_TOKEN_RE = /\b[\p{Lu}][\p{L}\p{M}'-]{2,}\b/gu
const DIALOGUE_MARKER_RE = /[—«»"“”„]/u
const LOCATION_PREFIX_RE = /(?:^|[\s(,.;:!?-])(?:в|во|на|из|к|ко|in|at|to|into|from)\s+$/iu
const STOP_TOKENS = new Set([
  "The",
  "A",
  "An",
  "And",
  "But",
  "Or",
  "I",
  "We",
  "He",
  "She",
  "They",
  "It",
  "This",
  "That",
  "Вот",
  "Это",
  "И",
  "Но",
  "А",
  "Он",
  "Она",
  "Они",
  "Мы",
  "Я",
])

function collectCapitalizedTokenMatches(text: string): CapitalizedMatch[] {
  const matches: CapitalizedMatch[] = []
  const regex = new RegExp(CAPITALIZED_TOKEN_RE.source, CAPITALIZED_TOKEN_RE.flags)

  for (const match of text.matchAll(regex)) {
    const name = match[0]
    const index = match.index ?? -1
    if (index < 0 || STOP_TOKENS.has(name)) continue
    matches.push({ name, index })
  }

  return matches
}

function analyzeCapitalizedTokens(text: string): TokenAnalysis {
  const stats = new Map<string, CandidateStats>()
  let totalMatches = 0

  for (const match of collectCapitalizedTokenMatches(text)) {
    totalMatches += 1
    const existing = stats.get(match.name) ?? {
      name: match.name,
      count: 0,
      dialogueHits: 0,
      locationHits: 0,
    }

    existing.count += 1

    const before = text.slice(Math.max(0, match.index - 32), match.index)
    const after = text.slice(match.index + match.name.length, match.index + match.name.length + 32)

    if (DIALOGUE_MARKER_RE.test(before) || DIALOGUE_MARKER_RE.test(after)) {
      existing.dialogueHits += 1
    }

    if (LOCATION_PREFIX_RE.test(before)) {
      existing.locationHits += 1
    }

    stats.set(match.name, existing)
  }

  return {
    totalMatches,
    candidates: Array.from(stats.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  }
}

function extractCapitalizedTokensWithFrequency(text: string): CandidateWithFrequency[] {
  return analyzeCapitalizedTokens(text).candidates.map(({ name, count }) => ({ name, count }))
}

function characterScore(candidate: CandidateStats): number {
  return candidate.count * 3 + candidate.dialogueHits * 4 - candidate.locationHits * 2
}

function locationScore(candidate: CandidateStats): number {
  return candidate.count * 2 + candidate.locationHits * 5 - candidate.dialogueHits
}

function formatCandidate(candidate: CandidateWithFrequency): string {
  return `${candidate.name} (×${candidate.count})`
}

function rankCandidates(
  candidates: CandidateStats[],
  limit: number,
  primaryScore: (candidate: CandidateStats) => number,
  secondaryScore: (candidate: CandidateStats) => number,
): CandidateWithFrequency[] {
  return [...candidates]
    .sort(
      (a, b) =>
        primaryScore(b) - primaryScore(a) ||
        secondaryScore(b) - secondaryScore(a) ||
        b.count - a.count ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit)
    .map(({ name, count }) => ({ name, count }))
}

function classifyCandidates(candidates: CandidateStats[], characterLimit: number, locationLimit: number) {
  const preferredCharacters = candidates.filter((candidate) => characterScore(candidate) >= locationScore(candidate))
  const preferredLocations = candidates.filter((candidate) => locationScore(candidate) > characterScore(candidate))

  const rankedCharacters = rankCandidates(preferredCharacters, characterLimit, characterScore, locationScore)
  const rankedLocations = rankCandidates(preferredLocations, locationLimit, locationScore, characterScore)

  const usedNames = new Set([...rankedCharacters, ...rankedLocations].map((candidate) => candidate.name))

  const fallbackCharacters = rankCandidates(candidates, characterLimit * 2, characterScore, locationScore).filter(
    (candidate) => !usedNames.has(candidate.name),
  )
  const fallbackLocations = rankCandidates(candidates, locationLimit * 2, locationScore, characterScore).filter(
    (candidate) => !usedNames.has(candidate.name),
  )

  return {
    characters: rankedCharacters.concat(fallbackCharacters).slice(0, characterLimit),
    locations: rankedLocations.concat(fallbackLocations).slice(0, locationLimit),
  }
}

export const extractCanonTool = tool({
  description:
    "Scan manuscript files (md/txt/docx) and return heuristic canon candidates (character names, location names). This is a ROUGH HEURISTIC — use lorekeeper/critic agents to refine and classify the output. Timeline, rules, and threads require LLM-based extraction.",
  args: {
    paths: tool.schema.array(tool.schema.string()).optional().describe("File or directory paths. If omitted, scan the worktree."),
    maxFiles: tool.schema.number().int().min(1).max(5000).optional().describe("Maximum files to scan (default 500)."),
  },
  async execute(args, context) {
    const maxFiles = args.maxFiles ?? 500
    const roots = (args.paths?.length ? args.paths : [context.worktree]).map((p) => (path.isAbsolute(p) ? p : path.join(context.directory, p)))

    const patterns: string[] = []
    for (const r of roots) {
      const statExists = await fileExists(r)
      if (!statExists) continue
      const ext = path.extname(r).toLowerCase()
      if ([".md", ".mdx", ".txt", ".docx"].includes(ext)) {
        patterns.push(r)
      } else {
        // directory or unknown: glob within
        patterns.push(path.join(r, "**/*.{md,mdx,txt,docx}"))
      }
    }

    const files = (await fg(patterns, { ignore: DEFAULT_IGNORE_GLOBS, dot: false, onlyFiles: true, unique: true })).slice(0, maxFiles)

    let corpus = ""
    const notes: string[] = []
    for (const f of files) {
      const ext = path.extname(f).toLowerCase()
      try {
        if (ext === ".docx") {
          corpus += `\n\n# FILE: ${path.relative(context.worktree, f)}\n` + (await readDocxText(f))
        } else {
          const t = await readText(f)
          if (isProbablyBinary(t)) continue
          corpus += `\n\n# FILE: ${path.relative(context.worktree, f)}\n` + t
        }
      } catch (e) {
        notes.push(`Failed to read ${path.relative(context.worktree, f)}: ${(e as Error).message}`)
      }
      if (corpus.length > 2_000_000) {
        notes.push("Corpus truncated to ~2MB for tool output.")
        break
      }
    }

    const analysis = analyzeCapitalizedTokens(corpus)
    const capsWithFreq = analysis.candidates.map(({ name, count }) => ({ name, count }))
    const { characters, locations } = classifyCandidates(analysis.candidates, 60, 40)

    const canon: Canon = {
      characters: characters.map(formatCandidate),
      locations: locations.map(formatCandidate),
      timeline: [],
      rules: [],
      threads: [],
      notes: [
        `Scanned ${files.length} files (maxFiles=${maxFiles}).`,
        `Extracted ${analysis.totalMatches} capitalized tokens.`,
        `Ranked ${capsWithFreq.length} unique capitalized candidates by frequency and context.`,
        "IMPORTANT: This is heuristic name extraction only. Characters and locations are BEST-GUESSES based on capitalization frequency.",
        "Timeline events, world rules, glossary terms, and plot threads require LLM-based extraction by the lorekeeper agent.",
        "Review and reclassify the candidates before merging into canon.",
        ...notes,
      ],
    }

    return JSON.stringify(canon, null, 2)
  },
})
