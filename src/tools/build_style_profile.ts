import { tool } from "@opencode-ai/plugin"

// ── Stopword sets ──────────────────────────────────────────────────────────

const EN_STOPWORDS = new Set([
  "a","an","the","and","or","but","if","in","on","at","to","for","of","with",
  "by","from","as","is","was","are","were","be","been","being","have","has",
  "had","do","does","did","will","would","shall","should","may","might","can",
  "could","not","no","nor","so","than","too","very","just","about","above",
  "after","again","all","also","am","any","because","before","below","between",
  "both","each","few","further","get","got","he","her","here","him","his","how",
  "i","into","it","its","let","me","more","most","my","myself","now","only",
  "other","our","out","over","own","s","same","she","some","such","t","that",
  "their","them","then","there","these","they","this","those","through","up",
  "us","we","what","when","where","which","while","who","whom","why","you",
  "your","re","ve","ll","d","m","don","doesn","didn","won","wouldn","couldn",
  "shouldn","isn","aren","wasn","weren","hasn","haven","hadn",
])

const RU_STOPWORDS = new Set([
  "и","в","на","с","не","что","он","она","они","это","но","я","ты","мы","вы",
  "по","за","из","от","до","как","так","то","все","его","её","их","мой","твой",
  "наш","ваш","свой","был","была","было","были","быть","бы","ли","да","нет",
  "уже","ещё","еще","тоже","же","вот","тут","там","здесь","когда","где","если",
  "чтобы","потому","только","очень","при","для","через","между","более","менее",
  "ну","ведь","даже","вот","себя","себе","к","о","у","а","её","нё","этот",
  "эта","эти","тот","та","те","сам","сама","само","сами","весь","вся","всё",
  "какой","какая","какие","который","которая","которые","кто","чего","чему",
  "чем","мне","меня","тебя","тебе","нас","нам","вас","вам","ему","ей","им",
  "ими","ним","ней","нему","ними","нём","ним","него","неё",
])

// ── Text analysis helpers ──────────────────────────────────────────────────

function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace or end-of-string.
  // Handles English (.!?) and Russian punctuation.
  return text
    .split(/(?<=[.!?…»""\u0021\u003F])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

function tokenizeWords(text: string): string[] {
  // Supports Latin and Cyrillic word characters
  const matches = text.match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu)
  return matches ? matches.map((w) => w.toLowerCase()) : []
}

function isDialogueLine(line: string): boolean {
  const trimmed = line.trim()
  // Dash-prefixed dialogue (Russian / European convention)
  if (/^[—–]\s/.test(trimmed) || /^-\s/.test(trimmed)) return true
  // Quoted speech detectors
  if (/["«]/.test(trimmed) && /["»]/.test(trimmed)) return true
  if (/["\u201C]/.test(trimmed) && /["\u201D]/.test(trimmed)) return true
  return false
}

function computeDialogueRatio(text: string): number {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return 0
  const dialogueLines = lines.filter(isDialogueLine).length
  return dialogueLines / lines.length
}

function detectPOV(words: string[]): string {
  const first = new Set(["i", "me", "my", "mine", "myself", "we", "us", "our",
    "я", "мне", "меня", "мой", "моя", "моё", "мои", "мы", "нас", "наш"])
  const third = new Set(["he", "she", "him", "her", "his", "they", "them", "their",
    "он", "она", "его", "её", "ему", "ей", "они", "их", "им"])

  let firstCount = 0
  let thirdCount = 0
  for (const w of words) {
    if (first.has(w)) firstCount++
    if (third.has(w)) thirdCount++
  }
  if (firstCount === 0 && thirdCount === 0) return "indeterminate"
  if (firstCount > thirdCount * 1.5) return "first-person"
  if (thirdCount > firstCount * 1.5) return "third-person"
  return "mixed"
}

function detectTense(words: string[]): string {
  const pastMarkers = new Set(["was", "were", "had", "did", "went", "said", "came",
    "took", "made", "got", "knew", "thought", "told", "found", "gave",
    "был", "была", "было", "были", "сказал", "сказала", "пошёл", "пошла",
    "стал", "стала", "увидел", "увидела", "подумал", "подумала",
    "взял", "взяла", "пришёл", "пришла", "ушёл", "ушла"])
  const presentMarkers = new Set(["is", "are", "am", "do", "does", "has", "says",
    "goes", "comes", "takes", "makes", "gets", "knows", "thinks", "tells",
    "есть", "говорит", "идёт", "стоит", "знает", "думает", "видит",
    "берёт", "приходит", "уходит", "делает", "смотрит"])

  let pastCount = 0
  let presentCount = 0
  for (const w of words) {
    if (pastMarkers.has(w)) pastCount++
    if (presentMarkers.has(w)) presentCount++
  }

  // Also count English past-tense -ed endings (rough heuristic)
  for (const w of words) {
    if (w.length > 3 && w.endsWith("ed") && !presentMarkers.has(w)) pastCount++
  }

  if (pastCount === 0 && presentCount === 0) return "indeterminate"
  if (pastCount > presentCount * 1.5) return "past"
  if (presentCount > pastCount * 1.5) return "present"
  return "mixed"
}

function classifySentenceLength(avg: number): string {
  if (avg < 10) return "short"
  if (avg < 20) return "medium"
  return "long"
}

function classifyParagraphDensity(avgSentencesPerParagraph: number): string {
  if (avgSentencesPerParagraph <= 2) return "airy"
  if (avgSentencesPerParagraph <= 5) return "moderate"
  return "dense"
}

function getTopWords(words: string[], n: number): Array<{ word: string; count: number }> {
  const isStopword = (w: string) => EN_STOPWORDS.has(w) || RU_STOPWORDS.has(w)
  const freq = new Map<string, number>()
  for (const w of words) {
    if (w.length < 2 || isStopword(w)) continue
    freq.set(w, (freq.get(w) ?? 0) + 1)
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }))
}

// ── Tool definition ────────────────────────────────────────────────────────

export const buildStyleProfileTool = tool({
  description: "Build a lightweight style profile from sample text with computed metrics.",
  args: {
    samples: tool.schema.array(tool.schema.string()).min(1).describe("Sample text passages"),
  },
  async execute(args) {
    const combined = args.samples.join("\n\n")
    const sentences = splitSentences(combined)
    const paragraphs = splitParagraphs(combined)
    const words = tokenizeWords(combined)

    const totalWords = words.length
    const totalSentences = sentences.length
    const totalParagraphs = paragraphs.length

    // Sentence metrics
    const sentenceLengths = sentences.map((s) => tokenizeWords(s).length)
    const avgSentenceLength = totalSentences > 0
      ? sentenceLengths.reduce((a, b) => a + b, 0) / totalSentences
      : 0

    // Paragraph metrics
    const sentencesPerParagraph = paragraphs.map((p) => splitSentences(p).length)
    const avgParagraphLength = totalParagraphs > 0
      ? sentencesPerParagraph.reduce((a, b) => a + b, 0) / totalParagraphs
      : 0

    // Dialogue
    const dialogueRatio = computeDialogueRatio(combined)

    // Vocabulary
    const uniqueWords = new Set(words).size
    const vocabularyRichness = totalWords > 0 ? uniqueWords / totalWords : 0

    // POV & Tense
    const pov = detectPOV(words)
    const tense = detectTense(words)

    // Top content words
    const topWords = getTopWords(words, 10)

    // Format output
    const lines: string[] = [
      "# Style Profile",
      "",
      "## Source",
      `- Samples: ${args.samples.length}`,
      `- Total words: ${totalWords}`,
      `- Total sentences: ${totalSentences}`,
      `- Total paragraphs: ${totalParagraphs}`,
      "",
      "## Sentence Structure",
      `- Average sentence length: ${avgSentenceLength.toFixed(1)} words (${classifySentenceLength(avgSentenceLength)})`,
      `- Sentence length range: ${Math.min(...(sentenceLengths.length ? sentenceLengths : [0]))}–${Math.max(...(sentenceLengths.length ? sentenceLengths : [0]))} words`,
      "",
      "## Paragraph Rhythm",
      `- Average sentences per paragraph: ${avgParagraphLength.toFixed(1)}`,
      `- Density: ${classifyParagraphDensity(avgParagraphLength)}`,
      "",
      "## Dialogue",
      `- Dialogue ratio: ${(dialogueRatio * 100).toFixed(1)}%`,
      `- Style: ${dialogueRatio > 0.4 ? "dialogue-heavy" : dialogueRatio > 0.15 ? "balanced" : "narrative-driven"}`,
      "",
      "## Vocabulary",
      `- Unique words: ${uniqueWords}`,
      `- Vocabulary richness (TTR): ${vocabularyRichness.toFixed(3)}`,
      "",
      "## Top Recurring Words",
      ...topWords.map((w) => `- ${w.word} (${w.count})`),
      "",
      "## Voice",
      `- Point of view: ${pov}`,
      `- Dominant tense: ${tense}`,
      "",
      "## Constraints",
      "- Preserve manuscript language and register.",
      "- Match the detected rhythm and sentence structure when writing new content.",
    ]

    return lines.join("\n")
  },
})
