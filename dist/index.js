// @bun
// src/plugin.ts
import path13 from "path";

// src/util/fs.ts
import path from "path";
import { access, mkdir, readFile, rename, writeFile } from "fs/promises";
async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}
async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
async function readText(filePath) {
  return readFile(filePath, "utf8");
}
async function writeTextAtomic(filePath, content) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  const tmp = `${filePath}.tmp.${Date.now()}`;
  await writeFile(tmp, content, "utf8");
  await rename(tmp, filePath);
}

// src/util/assets.ts
import path2 from "path";
import { existsSync } from "fs";
import { readdir, readFile as readFile2 } from "fs/promises";
import { fileURLToPath } from "url";
function assetsRoot() {
  const bundled = fileURLToPath(new URL("./assets/", import.meta.url));
  if (existsSync(bundled))
    return bundled;
  const source = fileURLToPath(new URL("../../assets/", import.meta.url));
  if (existsSync(source))
    return source;
  throw new Error("Open Quill: could not locate assets directory");
}
async function listDirMd(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => e.name);
}
async function listAssetFiles() {
  const root = assetsRoot();
  const out = [];
  for (const f of await listDirMd(path2.join(root, "agents")))
    out.push(`agents/${f}`);
  for (const f of await listDirMd(path2.join(root, "commands")))
    out.push(`commands/${f}`);
  return out;
}
async function readAssetText(assetPath) {
  const abs = path2.join(assetsRoot(), assetPath);
  return readFile2(abs, "utf8");
}

// src/util/state.ts
import path3 from "path";
import { mkdir as mkdir2, writeFile as writeFile2 } from "fs/promises";
function detectConfigRoot() {
  const xdg = Bun.env.XDG_CONFIG_HOME;
  if (xdg)
    return path3.join(xdg, "opencode");
  const userProfile = Bun.env.USERPROFILE;
  if (userProfile)
    return path3.join(userProfile, ".config", "opencode");
  const home = Bun.env.HOME;
  if (home)
    return path3.join(home, ".config", "opencode");
  return path3.resolve(".opencode");
}
function getStateDir(configRoot) {
  return path3.join(configRoot, ".open-quill");
}
async function loadManifest(stateDir) {
  const p = path3.join(stateDir, "manifest.json");
  try {
    const t = await Bun.file(p).text();
    const parsed = JSON.parse(t);
    return {
      version: parsed.version ?? "0.0.0",
      files: Array.isArray(parsed.files) ? parsed.files : []
    };
  } catch {
    return { version: "0.0.0", files: [] };
  }
}
async function saveManifest(stateDir, manifest) {
  await mkdir2(stateDir, { recursive: true });
  const p = path3.join(stateDir, "manifest.json");
  await writeFile2(p, JSON.stringify(manifest, null, 2), "utf8");
}

// src/util/ownership.ts
var SENTINEL = "<!-- open-quill:managed -->";
function isOwnedByOpenQuill(content) {
  const head = content.split(/\r?\n/).slice(0, 50).join(`
`);
  if (head.includes(SENTINEL))
    return true;
  if (!head.startsWith("---"))
    return false;
  const endIdx = head.indexOf(`
---`, 3);
  const fm = endIdx >= 0 ? head.slice(3, endIdx) : head;
  return /\bx_openquill\s*:/m.test(fm);
}
function stampOwnedFrontmatter(content, params) {
  const lines = content.split(/\r?\n/);
  const hasSentinel = lines[0]?.trim() === SENTINEL;
  const withSentinel = hasSentinel ? lines : [SENTINEL, ...lines];
  if (withSentinel[1] !== "---") {
    return [
      withSentinel[0],
      "---",
      `x_openquill: { managed: true, version: "${params.version}" }`,
      "---",
      ...withSentinel.slice(1)
    ].join(`
`);
  }
  const fmEnd = withSentinel.indexOf("---", 2);
  if (fmEnd === -1)
    return withSentinel.join(`
`);
  const fmLines = withSentinel.slice(2, fmEnd);
  const rest = withSentinel.slice(fmEnd);
  const existingIdx = fmLines.findIndex((l) => /^x_openquill\s*:/i.test(l.trim()));
  const stamp = `x_openquill: { managed: true, version: "${params.version}" }`;
  if (existingIdx >= 0)
    fmLines[existingIdx] = stamp;
  else
    fmLines.push(stamp);
  return [withSentinel[0], "---", ...fmLines, ...rest].join(`
`);
}

// src/tools/extract_canon.ts
import { tool } from "@opencode-ai/plugin";
import fg from "fast-glob";
import path4 from "path";
import mammoth from "mammoth";

// src/util/scan.ts
var DEFAULT_IGNORE_GLOBS = [
  "**/.git/**",
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.opencode/**",
  "**/.open-quill/**",
  "**/.cache/**"
];
function isProbablyBinary(text) {
  const nul = text.includes("\x00");
  return nul;
}

// src/tools/extract_canon.ts
async function readDocxText(filePath) {
  const res = await mammoth.extractRawText({ path: filePath });
  return res.value ?? "";
}
function extractCapitalizedTokens(text) {
  const tokens = text.match(/\b[\p{Lu}][\p{L}\p{M}'-]{2,}\b/gu) ?? [];
  const stop = new Set(["The", "A", "An", "And", "But", "Or", "I", "We", "He", "She", "They", "It", "This", "That", "\u0412\u043E\u0442", "\u042D\u0442\u043E", "\u0418", "\u041D\u043E", "\u0410", "\u041E\u043D", "\u041E\u043D\u0430", "\u041E\u043D\u0438", "\u041C\u044B", "\u042F"]);
  return Array.from(new Set(tokens.filter((t) => !stop.has(t)))).slice(0, 500);
}
var extractCanonTool = tool({
  description: "Scan manuscript files (md/txt/docx) and return structured canon candidates (characters, locations, timeline points, rules, unresolved threads).",
  args: {
    paths: tool.schema.array(tool.schema.string()).optional().describe("File or directory paths. If omitted, scan the worktree."),
    maxFiles: tool.schema.number().int().min(1).max(5000).optional().describe("Maximum files to scan (default 500).")
  },
  async execute(args, context) {
    const maxFiles = args.maxFiles ?? 500;
    const roots = ((args.paths?.length) ? args.paths : [context.worktree]).map((p) => path4.isAbsolute(p) ? p : path4.join(context.directory, p));
    const patterns = [];
    for (const r of roots) {
      const statExists = await fileExists(r);
      if (!statExists)
        continue;
      const ext = path4.extname(r).toLowerCase();
      if ([".md", ".mdx", ".txt", ".docx"].includes(ext)) {
        patterns.push(r);
      } else {
        patterns.push(path4.join(r, "**/*.{md,mdx,txt,docx}"));
      }
    }
    const files = (await fg(patterns, { ignore: DEFAULT_IGNORE_GLOBS, dot: false, onlyFiles: true, unique: true })).slice(0, maxFiles);
    let corpus = "";
    const notes = [];
    for (const f of files) {
      const ext = path4.extname(f).toLowerCase();
      try {
        if (ext === ".docx") {
          corpus += `

# FILE: ${path4.relative(context.worktree, f)}
` + await readDocxText(f);
        } else {
          const t = await readText(f);
          if (isProbablyBinary(t))
            continue;
          corpus += `

# FILE: ${path4.relative(context.worktree, f)}
` + t;
        }
      } catch (e) {
        notes.push(`Failed to read ${path4.relative(context.worktree, f)}: ${e.message}`);
      }
      if (corpus.length > 2000000) {
        notes.push("Corpus truncated to ~2MB for tool output.");
        break;
      }
    }
    const caps = extractCapitalizedTokens(corpus);
    const canon = {
      characters: caps.slice(0, 60),
      locations: caps.slice(60, 100),
      timeline: [],
      rules: [],
      threads: [],
      notes: [
        `Scanned ${files.length} files (maxFiles=${maxFiles}).`,
        "Heuristic extraction only. Use lorekeeper/critic agents to refine canon.",
        ...notes
      ]
    };
    return JSON.stringify(canon, null, 2);
  }
});

// src/tools/prose_diff.ts
import { tool as tool2 } from "@opencode-ai/plugin";
import { diffLines } from "diff";
var proseDiffTool = tool2({
  description: "Summarize differences between original and revised prose.",
  args: {
    original: tool2.schema.string().describe("Original text"),
    revised: tool2.schema.string().describe("Revised text")
  },
  async execute(args) {
    const parts = diffLines(args.original, args.revised);
    let added = 0;
    let removed = 0;
    for (const p of parts) {
      const lines = p.value.split(/\r?\n/).length - 1;
      if (p.added)
        added += lines;
      if (p.removed)
        removed += lines;
    }
    const snippet = parts.slice(0, 200).map((p) => {
      const prefix = p.added ? "+" : p.removed ? "-" : " ";
      return p.value.split(/\r?\n/).slice(0, 50).map((l) => `${prefix}${l}`).join(`
`);
    }).join(`
`);
    return [
      `## Prose Diff Summary`,
      `- Lines added: ${added}`,
      `- Lines removed: ${removed}`,
      "",
      "```diff",
      snippet.trimEnd(),
      "```"
    ].join(`
`);
  }
});

// src/tools/continuity_check.ts
import { tool as tool3 } from "@opencode-ai/plugin";
var continuityCheckTool = tool3({
  description: "Perform a lightweight continuity check for a chapter against canon notes.",
  args: {
    chapter: tool3.schema.string().describe("Chapter text"),
    canon: tool3.schema.string().optional().describe("Canon notes (characters/locations/timeline/etc)")
  },
  async execute(args) {
    const issues = [];
    if (args.canon) {
      const canonNames = Array.from(new Set((args.canon.match(/\b[\p{Lu}][\p{L}\p{M}'-]{2,}\b/gu) ?? []).slice(0, 200)));
      const missing = canonNames.filter((n) => !args.chapter.includes(n)).slice(0, 25);
      if (missing.length) {
        issues.push(`Canon mentions names not seen in chapter (may be ok): ${missing.join(", ")}`);
      }
    } else {
      issues.push("No canon provided; continuity check is best-effort.");
    }
    return [
      "## Continuity Check (v1 heuristic)",
      "",
      ...issues.length ? issues.map((i) => `- ${i}`) : ["- No obvious issues found by heuristics."],
      "",
      "Notes: This tool is intentionally conservative and heuristic-based. Use the critic agent for deeper analysis."
    ].join(`
`);
  }
});

// src/tools/build_style_profile.ts
import { tool as tool4 } from "@opencode-ai/plugin";
var EN_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "was",
  "are",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "shall",
  "should",
  "may",
  "might",
  "can",
  "could",
  "not",
  "no",
  "nor",
  "so",
  "than",
  "too",
  "very",
  "just",
  "about",
  "above",
  "after",
  "again",
  "all",
  "also",
  "am",
  "any",
  "because",
  "before",
  "below",
  "between",
  "both",
  "each",
  "few",
  "further",
  "get",
  "got",
  "he",
  "her",
  "here",
  "him",
  "his",
  "how",
  "i",
  "into",
  "it",
  "its",
  "let",
  "me",
  "more",
  "most",
  "my",
  "myself",
  "now",
  "only",
  "other",
  "our",
  "out",
  "over",
  "own",
  "s",
  "same",
  "she",
  "some",
  "such",
  "t",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "up",
  "us",
  "we",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "whom",
  "why",
  "you",
  "your",
  "re",
  "ve",
  "ll",
  "d",
  "m",
  "don",
  "doesn",
  "didn",
  "won",
  "wouldn",
  "couldn",
  "shouldn",
  "isn",
  "aren",
  "wasn",
  "weren",
  "hasn",
  "haven",
  "hadn"
]);
var RU_STOPWORDS = new Set([
  "\u0438",
  "\u0432",
  "\u043D\u0430",
  "\u0441",
  "\u043D\u0435",
  "\u0447\u0442\u043E",
  "\u043E\u043D",
  "\u043E\u043D\u0430",
  "\u043E\u043D\u0438",
  "\u044D\u0442\u043E",
  "\u043D\u043E",
  "\u044F",
  "\u0442\u044B",
  "\u043C\u044B",
  "\u0432\u044B",
  "\u043F\u043E",
  "\u0437\u0430",
  "\u0438\u0437",
  "\u043E\u0442",
  "\u0434\u043E",
  "\u043A\u0430\u043A",
  "\u0442\u0430\u043A",
  "\u0442\u043E",
  "\u0432\u0441\u0435",
  "\u0435\u0433\u043E",
  "\u0435\u0451",
  "\u0438\u0445",
  "\u043C\u043E\u0439",
  "\u0442\u0432\u043E\u0439",
  "\u043D\u0430\u0448",
  "\u0432\u0430\u0448",
  "\u0441\u0432\u043E\u0439",
  "\u0431\u044B\u043B",
  "\u0431\u044B\u043B\u0430",
  "\u0431\u044B\u043B\u043E",
  "\u0431\u044B\u043B\u0438",
  "\u0431\u044B\u0442\u044C",
  "\u0431\u044B",
  "\u043B\u0438",
  "\u0434\u0430",
  "\u043D\u0435\u0442",
  "\u0443\u0436\u0435",
  "\u0435\u0449\u0451",
  "\u0435\u0449\u0435",
  "\u0442\u043E\u0436\u0435",
  "\u0436\u0435",
  "\u0432\u043E\u0442",
  "\u0442\u0443\u0442",
  "\u0442\u0430\u043C",
  "\u0437\u0434\u0435\u0441\u044C",
  "\u043A\u043E\u0433\u0434\u0430",
  "\u0433\u0434\u0435",
  "\u0435\u0441\u043B\u0438",
  "\u0447\u0442\u043E\u0431\u044B",
  "\u043F\u043E\u0442\u043E\u043C\u0443",
  "\u0442\u043E\u043B\u044C\u043A\u043E",
  "\u043E\u0447\u0435\u043D\u044C",
  "\u043F\u0440\u0438",
  "\u0434\u043B\u044F",
  "\u0447\u0435\u0440\u0435\u0437",
  "\u043C\u0435\u0436\u0434\u0443",
  "\u0431\u043E\u043B\u0435\u0435",
  "\u043C\u0435\u043D\u0435\u0435",
  "\u043D\u0443",
  "\u0432\u0435\u0434\u044C",
  "\u0434\u0430\u0436\u0435",
  "\u0432\u043E\u0442",
  "\u0441\u0435\u0431\u044F",
  "\u0441\u0435\u0431\u0435",
  "\u043A",
  "\u043E",
  "\u0443",
  "\u0430",
  "\u0435\u0451",
  "\u043D\u0451",
  "\u044D\u0442\u043E\u0442",
  "\u044D\u0442\u0430",
  "\u044D\u0442\u0438",
  "\u0442\u043E\u0442",
  "\u0442\u0430",
  "\u0442\u0435",
  "\u0441\u0430\u043C",
  "\u0441\u0430\u043C\u0430",
  "\u0441\u0430\u043C\u043E",
  "\u0441\u0430\u043C\u0438",
  "\u0432\u0435\u0441\u044C",
  "\u0432\u0441\u044F",
  "\u0432\u0441\u0451",
  "\u043A\u0430\u043A\u043E\u0439",
  "\u043A\u0430\u043A\u0430\u044F",
  "\u043A\u0430\u043A\u0438\u0435",
  "\u043A\u043E\u0442\u043E\u0440\u044B\u0439",
  "\u043A\u043E\u0442\u043E\u0440\u0430\u044F",
  "\u043A\u043E\u0442\u043E\u0440\u044B\u0435",
  "\u043A\u0442\u043E",
  "\u0447\u0435\u0433\u043E",
  "\u0447\u0435\u043C\u0443",
  "\u0447\u0435\u043C",
  "\u043C\u043D\u0435",
  "\u043C\u0435\u043D\u044F",
  "\u0442\u0435\u0431\u044F",
  "\u0442\u0435\u0431\u0435",
  "\u043D\u0430\u0441",
  "\u043D\u0430\u043C",
  "\u0432\u0430\u0441",
  "\u0432\u0430\u043C",
  "\u0435\u043C\u0443",
  "\u0435\u0439",
  "\u0438\u043C",
  "\u0438\u043C\u0438",
  "\u043D\u0438\u043C",
  "\u043D\u0435\u0439",
  "\u043D\u0435\u043C\u0443",
  "\u043D\u0438\u043C\u0438",
  "\u043D\u0451\u043C",
  "\u043D\u0438\u043C",
  "\u043D\u0435\u0433\u043E",
  "\u043D\u0435\u0451"
]);
function splitSentences(text) {
  return text.split(/(?<=[.!?\u2026\u00BB""\u0021\u003F])\s+/).map((s) => s.trim()).filter((s) => s.length > 0);
}
function splitParagraphs(text) {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
}
function tokenizeWords(text) {
  const matches = text.match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu);
  return matches ? matches.map((w) => w.toLowerCase()) : [];
}
function isDialogueLine(line) {
  const trimmed = line.trim();
  if (/^[\u2014\u2013]\s/.test(trimmed) || /^-\s/.test(trimmed))
    return true;
  if (/["\u00AB]/.test(trimmed) && /["\u00BB]/.test(trimmed))
    return true;
  if (/["\u201C]/.test(trimmed) && /["\u201D]/.test(trimmed))
    return true;
  return false;
}
function computeDialogueRatio(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0)
    return 0;
  const dialogueLines = lines.filter(isDialogueLine).length;
  return dialogueLines / lines.length;
}
function detectPOV(words) {
  const first = new Set([
    "i",
    "me",
    "my",
    "mine",
    "myself",
    "we",
    "us",
    "our",
    "\u044F",
    "\u043C\u043D\u0435",
    "\u043C\u0435\u043D\u044F",
    "\u043C\u043E\u0439",
    "\u043C\u043E\u044F",
    "\u043C\u043E\u0451",
    "\u043C\u043E\u0438",
    "\u043C\u044B",
    "\u043D\u0430\u0441",
    "\u043D\u0430\u0448"
  ]);
  const third = new Set([
    "he",
    "she",
    "him",
    "her",
    "his",
    "they",
    "them",
    "their",
    "\u043E\u043D",
    "\u043E\u043D\u0430",
    "\u0435\u0433\u043E",
    "\u0435\u0451",
    "\u0435\u043C\u0443",
    "\u0435\u0439",
    "\u043E\u043D\u0438",
    "\u0438\u0445",
    "\u0438\u043C"
  ]);
  let firstCount = 0;
  let thirdCount = 0;
  for (const w of words) {
    if (first.has(w))
      firstCount++;
    if (third.has(w))
      thirdCount++;
  }
  if (firstCount === 0 && thirdCount === 0)
    return "indeterminate";
  if (firstCount > thirdCount * 1.5)
    return "first-person";
  if (thirdCount > firstCount * 1.5)
    return "third-person";
  return "mixed";
}
function detectTense(words) {
  const pastMarkers = new Set([
    "was",
    "were",
    "had",
    "did",
    "went",
    "said",
    "came",
    "took",
    "made",
    "got",
    "knew",
    "thought",
    "told",
    "found",
    "gave",
    "\u0431\u044B\u043B",
    "\u0431\u044B\u043B\u0430",
    "\u0431\u044B\u043B\u043E",
    "\u0431\u044B\u043B\u0438",
    "\u0441\u043A\u0430\u0437\u0430\u043B",
    "\u0441\u043A\u0430\u0437\u0430\u043B\u0430",
    "\u043F\u043E\u0448\u0451\u043B",
    "\u043F\u043E\u0448\u043B\u0430",
    "\u0441\u0442\u0430\u043B",
    "\u0441\u0442\u0430\u043B\u0430",
    "\u0443\u0432\u0438\u0434\u0435\u043B",
    "\u0443\u0432\u0438\u0434\u0435\u043B\u0430",
    "\u043F\u043E\u0434\u0443\u043C\u0430\u043B",
    "\u043F\u043E\u0434\u0443\u043C\u0430\u043B\u0430",
    "\u0432\u0437\u044F\u043B",
    "\u0432\u0437\u044F\u043B\u0430",
    "\u043F\u0440\u0438\u0448\u0451\u043B",
    "\u043F\u0440\u0438\u0448\u043B\u0430",
    "\u0443\u0448\u0451\u043B",
    "\u0443\u0448\u043B\u0430"
  ]);
  const presentMarkers = new Set([
    "is",
    "are",
    "am",
    "do",
    "does",
    "has",
    "says",
    "goes",
    "comes",
    "takes",
    "makes",
    "gets",
    "knows",
    "thinks",
    "tells",
    "\u0435\u0441\u0442\u044C",
    "\u0433\u043E\u0432\u043E\u0440\u0438\u0442",
    "\u0438\u0434\u0451\u0442",
    "\u0441\u0442\u043E\u0438\u0442",
    "\u0437\u043D\u0430\u0435\u0442",
    "\u0434\u0443\u043C\u0430\u0435\u0442",
    "\u0432\u0438\u0434\u0438\u0442",
    "\u0431\u0435\u0440\u0451\u0442",
    "\u043F\u0440\u0438\u0445\u043E\u0434\u0438\u0442",
    "\u0443\u0445\u043E\u0434\u0438\u0442",
    "\u0434\u0435\u043B\u0430\u0435\u0442",
    "\u0441\u043C\u043E\u0442\u0440\u0438\u0442"
  ]);
  let pastCount = 0;
  let presentCount = 0;
  for (const w of words) {
    if (pastMarkers.has(w))
      pastCount++;
    if (presentMarkers.has(w))
      presentCount++;
  }
  for (const w of words) {
    if (w.length > 3 && w.endsWith("ed") && !presentMarkers.has(w))
      pastCount++;
  }
  if (pastCount === 0 && presentCount === 0)
    return "indeterminate";
  if (pastCount > presentCount * 1.5)
    return "past";
  if (presentCount > pastCount * 1.5)
    return "present";
  return "mixed";
}
function classifySentenceLength(avg) {
  if (avg < 10)
    return "short";
  if (avg < 20)
    return "medium";
  return "long";
}
function classifyParagraphDensity(avgSentencesPerParagraph) {
  if (avgSentencesPerParagraph <= 2)
    return "airy";
  if (avgSentencesPerParagraph <= 5)
    return "moderate";
  return "dense";
}
function getTopWords(words, n) {
  const isStopword = (w) => EN_STOPWORDS.has(w) || RU_STOPWORDS.has(w);
  const freq = new Map;
  for (const w of words) {
    if (w.length < 2 || isStopword(w))
      continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([word, count]) => ({ word, count }));
}
var buildStyleProfileTool = tool4({
  description: "Build a lightweight style profile from sample text with computed metrics.",
  args: {
    samples: tool4.schema.array(tool4.schema.string()).min(1).describe("Sample text passages")
  },
  async execute(args) {
    const combined = args.samples.join(`

`);
    const sentences = splitSentences(combined);
    const paragraphs = splitParagraphs(combined);
    const words = tokenizeWords(combined);
    const totalWords = words.length;
    const totalSentences = sentences.length;
    const totalParagraphs = paragraphs.length;
    const sentenceLengths = sentences.map((s) => tokenizeWords(s).length);
    const avgSentenceLength = totalSentences > 0 ? sentenceLengths.reduce((a, b) => a + b, 0) / totalSentences : 0;
    const sentencesPerParagraph = paragraphs.map((p) => splitSentences(p).length);
    const avgParagraphLength = totalParagraphs > 0 ? sentencesPerParagraph.reduce((a, b) => a + b, 0) / totalParagraphs : 0;
    const dialogueRatio = computeDialogueRatio(combined);
    const uniqueWords = new Set(words).size;
    const vocabularyRichness = totalWords > 0 ? uniqueWords / totalWords : 0;
    const pov = detectPOV(words);
    const tense = detectTense(words);
    const topWords = getTopWords(words, 10);
    const lines = [
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
      `- Sentence length range: ${Math.min(...sentenceLengths.length ? sentenceLengths : [0])}\u2013${Math.max(...sentenceLengths.length ? sentenceLengths : [0])} words`,
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
      "- Match the detected rhythm and sentence structure when writing new content."
    ];
    return lines.join(`
`);
  }
});

// src/tools/set_project_language.ts
import { tool as tool5 } from "@opencode-ai/plugin";

// src/util/prefs.ts
import path5 from "path";
import { mkdir as mkdir3, writeFile as writeFile3 } from "fs/promises";
async function loadProjectPrefs(stateDir) {
  const p = path5.join(stateDir, "prefs.json");
  try {
    const t = await readText(p);
    return JSON.parse(t);
  } catch {
    return {};
  }
}
async function saveProjectPrefs(stateDir, prefs) {
  await mkdir3(stateDir, { recursive: true });
  const p = path5.join(stateDir, "prefs.json");
  await writeFile3(p, JSON.stringify(prefs, null, 2), "utf8");
}

// src/tools/set_project_language.ts
var setProjectLanguageTool = tool5({
  description: "Set the Open Quill per-project default output language (keyed by worktree path).",
  args: {
    language: tool5.schema.string().min(1).describe('Language code/name (e.g. "ru", "en").')
  },
  async execute(args, context) {
    const configRoot = detectConfigRoot();
    const stateDir = getStateDir(configRoot);
    const prefs = await loadProjectPrefs(stateDir);
    prefs.languageByWorktree ??= {};
    prefs.languageByWorktree[context.worktree] = args.language;
    await saveProjectPrefs(stateDir, prefs);
    return `Open Quill: project default output language set to "${args.language}" for worktree ${context.worktree}.`;
  }
});

// src/tools/scan_manuscripts.ts
import { tool as tool6 } from "@opencode-ai/plugin";
import fg2 from "fast-glob";
import path6 from "path";
var scanManuscriptsTool = tool6({
  description: "Find manuscript files in the project (md/mdx/txt/docx) with strong ignore defaults.",
  args: {
    roots: tool6.schema.array(tool6.schema.string()).optional().describe("Optional roots (relative to session directory or absolute)."),
    maxFiles: tool6.schema.number().int().min(1).max(20000).optional().describe("Max files to return (default 2000).")
  },
  async execute(args, context) {
    const maxFiles = args.maxFiles ?? 2000;
    const roots = ((args.roots?.length) ? args.roots : [context.worktree]).map((r) => path6.isAbsolute(r) ? r : path6.join(context.directory, r));
    const patterns = roots.map((r) => path6.join(r, "**/*.{md,mdx,txt,docx}"));
    const files = await fg2(patterns, { ignore: DEFAULT_IGNORE_GLOBS, onlyFiles: true, unique: true, dot: false });
    const rel = files.map((f) => path6.relative(context.worktree, f));
    return JSON.stringify({ count: rel.length, files: rel.slice(0, maxFiles) }, null, 2);
  }
});

// src/tools/read_manuscript_chunk.ts
import { tool as tool7 } from "@opencode-ai/plugin";
import path9 from "path";

// src/util/project_state.ts
import path7 from "path";
import { createHash } from "crypto";
import { mkdir as mkdir4 } from "fs/promises";
function worktreeKey(worktree) {
  return createHash("sha256").update(worktree).digest("hex").slice(0, 16);
}
function getProjectStateDir(stateDir, worktree) {
  return path7.join(stateDir, "projects", worktreeKey(worktree));
}
async function ensureProjectStateDir(stateDir, worktree) {
  const dir = getProjectStateDir(stateDir, worktree);
  await mkdir4(dir, { recursive: true });
  return dir;
}

// src/util/manuscript.ts
import path8 from "path";
import { createHash as createHash2 } from "crypto";
import { stat, writeFile as writeFile4, mkdir as mkdir5 } from "fs/promises";
import mammoth2 from "mammoth";
function hashString(input) {
  return createHash2("sha256").update(input).digest("hex");
}
async function ensureDocxCache(params) {
  const { cacheDir, absPath } = params;
  await mkdir5(cacheDir, { recursive: true });
  const s = await stat(absPath);
  const key = hashString(`${absPath}|${s.mtimeMs}|${s.size}`).slice(0, 24);
  const cachePath = path8.join(cacheDir, `${key}.txt`);
  const metaPath = path8.join(cacheDir, `${key}.json`);
  if (await fileExists(cachePath)) {
    const t = await readText(cachePath);
    return { cachePath, metaPath, textLength: t.length };
  }
  const res = await mammoth2.extractRawText({ path: absPath });
  const text = res.value ?? "";
  await writeFile4(cachePath, text, "utf8");
  await writeFile4(metaPath, JSON.stringify({ source: absPath, mtimeMs: s.mtimeMs, size: s.size }, null, 2), "utf8");
  return { cachePath, metaPath, textLength: text.length };
}
async function readTextChunk(params) {
  const { absPath, cursor, maxChars } = params;
  const full = await readText(absPath);
  const start = Math.max(0, cursor);
  const end = Math.min(full.length, start + maxChars);
  const text = full.slice(start, end);
  return { text, cursorNext: end, done: end >= full.length };
}

// src/tools/read_manuscript_chunk.ts
var readManuscriptChunkTool = tool7({
  description: "Read the next chunk of a manuscript file (.txt/.md/.mdx/.docx) using a cursor for iterative summarization.",
  args: {
    path: tool7.schema.string().describe("Path to a manuscript file (relative to session directory or absolute)."),
    cursor: tool7.schema.number().int().min(0).optional().describe("Cursor offset (chars). Default 0."),
    maxChars: tool7.schema.number().int().min(1000).max(50000).optional().describe("Max characters to return (default 12000).")
  },
  async execute(args, context) {
    const maxChars = args.maxChars ?? 12000;
    const cursor = args.cursor ?? 0;
    const abs = path9.isAbsolute(args.path) ? args.path : path9.join(context.directory, args.path);
    if (!await fileExists(abs))
      throw new Error(`File not found: ${abs}`);
    const ext = path9.extname(abs).toLowerCase();
    let readPath = abs;
    let cacheInfo;
    if (ext === ".docx") {
      const configRoot = detectConfigRoot();
      const stateDir = getStateDir(configRoot);
      const projectDir = await ensureProjectStateDir(stateDir, context.worktree);
      const cacheDir = path9.join(projectDir, "docx_cache");
      const { cachePath, textLength } = await ensureDocxCache({ cacheDir, absPath: abs });
      readPath = cachePath;
      cacheInfo = { cachePath, textLength };
    }
    const chunk = await readTextChunk({ absPath: readPath, cursor, maxChars });
    return JSON.stringify({
      file: path9.relative(context.worktree, abs),
      cursor,
      cursorNext: chunk.cursorNext,
      done: chunk.done,
      text: chunk.text,
      cache: cacheInfo ? { path: cacheInfo.cachePath, textLength: cacheInfo.textLength } : undefined
    }, null, 2);
  }
});

// src/tools/canon_merge.ts
import { tool as tool8 } from "@opencode-ai/plugin";
import path11 from "path";

// src/util/canon.ts
import path10 from "path";
import { readFile as readFile4, writeFile as writeFile5 } from "fs/promises";
function emptyCanonDB() {
  return {
    version: 1,
    characters: {},
    locations: {},
    glossary: {},
    world_rules: {},
    timeline: {},
    threads: {}
  };
}
async function loadCanonDB(projectDir) {
  const p = path10.join(projectDir, "canon_db.json");
  try {
    const raw = await readFile4(p, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1)
      return emptyCanonDB();
    return parsed;
  } catch {
    return emptyCanonDB();
  }
}
async function saveCanonDB(projectDir, db) {
  const p = path10.join(projectDir, "canon_db.json");
  await writeFile5(p, JSON.stringify(db, null, 2), "utf8");
}
async function loadConflicts(projectDir) {
  const p = path10.join(projectDir, "canon_conflicts.json");
  try {
    const raw = await readFile4(p, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
async function saveConflicts(projectDir, conflicts) {
  const p = path10.join(projectDir, "canon_conflicts.json");
  await writeFile5(p, JSON.stringify(conflicts, null, 2), "utf8");
}
function pushVariant(arr, value) {
  const v = value.trim();
  if (!v)
    return { changed: false, variants: arr };
  if (arr.some((x) => x.trim() === v))
    return { changed: false, variants: arr };
  return { changed: true, variants: [...arr, v] };
}
function upsertVariant(params) {
  const { variants, value } = params;
  const next = pushVariant(variants, value);
  const conflict = next.variants.length > 1;
  return { variants: next.variants, changed: next.changed, conflict };
}
function renderVariants(label, variants) {
  if (variants.length <= 1)
    return `${label}: ${variants[0] ?? ""}`.trimEnd();
  return `${label}: { ${variants.join(" | ")} } (unresolved)`;
}

// src/tools/canon_merge.ts
var canonMergeTool = tool8({
  description: "Merge extracted canon updates into the per-project canon DB. Conflicting facts are kept as variants and logged as conflicts.",
  args: {
    updates: tool8.schema.array(tool8.schema.object({
      kind: tool8.schema.enum(["character", "location", "glossary", "world_rule", "timeline", "thread"]),
      key: tool8.schema.string().min(1).describe("Entity key (e.g. character name, term, rule label)."),
      field: tool8.schema.string().optional().describe("Field name for character/location (e.g. age, hair, status)."),
      value: tool8.schema.string().min(1).describe("Proposed value.")
    })).min(1).describe("List of canon updates")
  },
  async execute(args, context) {
    const configRoot = detectConfigRoot();
    const stateDir = getStateDir(configRoot);
    const projectDir = await ensureProjectStateDir(stateDir, context.worktree);
    const db = await loadCanonDB(projectDir);
    const conflicts = await loadConflicts(projectDir);
    const createdConflicts = [];
    for (const u of args.updates) {
      const kind = u.kind;
      const key = u.key.trim();
      const value = u.value.trim();
      if (!key || !value)
        continue;
      if (kind === "character" || kind === "location") {
        const field = (u.field ?? "notes").trim();
        const table = kind === "character" ? db.characters : db.locations;
        table[key] ??= { fields: {} };
        table[key].fields[field] ??= [];
        const merged = upsertVariant({ variants: table[key].fields[field], value });
        table[key].fields[field] = merged.variants;
        if (merged.conflict) {
          createdConflicts.push({ kind, key, field, variants: merged.variants, status: "open" });
        }
        continue;
      }
      if (kind === "glossary") {
        db.glossary[key] ??= { definitions: [] };
        const merged = upsertVariant({ variants: db.glossary[key].definitions, value });
        db.glossary[key].definitions = merged.variants;
        if (merged.conflict)
          createdConflicts.push({ kind, key, variants: merged.variants, status: "open" });
        continue;
      }
      if (kind === "world_rule") {
        db.world_rules[key] ??= { variants: [] };
        const merged = upsertVariant({ variants: db.world_rules[key].variants, value });
        db.world_rules[key].variants = merged.variants;
        if (merged.conflict)
          createdConflicts.push({ kind, key, variants: merged.variants, status: "open" });
        continue;
      }
      if (kind === "timeline") {
        db.timeline[key] ??= { variants: [] };
        const merged = upsertVariant({ variants: db.timeline[key].variants, value });
        db.timeline[key].variants = merged.variants;
        if (merged.conflict)
          createdConflicts.push({ kind, key, variants: merged.variants, status: "open" });
        continue;
      }
      if (kind === "thread") {
        db.threads[key] ??= { variants: [] };
        const merged = upsertVariant({ variants: db.threads[key].variants, value });
        db.threads[key].variants = merged.variants;
        if (merged.conflict)
          createdConflicts.push({ kind, key, variants: merged.variants, status: "open" });
        continue;
      }
    }
    const existingKey = new Set(conflicts.map((c) => `${c.kind}|${c.key}|${c.field ?? ""}|${(c.variants ?? []).join("||")}`));
    for (const c of createdConflicts) {
      const k = `${c.kind}|${c.key}|${c.field ?? ""}|${(c.variants ?? []).join("||")}`;
      if (existingKey.has(k))
        continue;
      conflicts.push(c);
      existingKey.add(k);
    }
    await saveCanonDB(projectDir, db);
    await saveConflicts(projectDir, conflicts);
    return JSON.stringify({
      updated: args.updates.length,
      conflictsAdded: createdConflicts.length,
      canonDBPath: path11.join(projectDir, "canon_db.json"),
      conflictsPath: path11.join(projectDir, "canon_conflicts.json")
    }, null, 2);
  }
});

// src/tools/canon_snapshot.ts
import { tool as tool9 } from "@opencode-ai/plugin";
import path12 from "path";
var canonSnapshotTool = tool9({
  description: "Render the current per-project canon DB into markdown files (characters/locations/glossary/world_rules/timeline) plus a watchlist.",
  args: {},
  async execute(_args, context) {
    const configRoot = detectConfigRoot();
    const stateDir = getStateDir(configRoot);
    const projectDir = await ensureProjectStateDir(stateDir, context.worktree);
    const db = await loadCanonDB(projectDir);
    const conflicts = await loadConflicts(projectDir);
    const charactersMd = (() => {
      const lines = ["# characters.md", ""];
      const names = Object.keys(db.characters).sort((a, b) => a.localeCompare(b));
      for (const name of names) {
        lines.push(`## ${name}`);
        const fields = db.characters[name].fields;
        for (const f of Object.keys(fields).sort((a, b) => a.localeCompare(b))) {
          lines.push(`- ${renderVariants(f, fields[f])}`);
        }
        lines.push("");
      }
      return lines.join(`
`).trimEnd();
    })();
    const locationsMd = (() => {
      const lines = ["# locations.md", ""];
      const names = Object.keys(db.locations).sort((a, b) => a.localeCompare(b));
      for (const name of names) {
        lines.push(`## ${name}`);
        const fields = db.locations[name].fields;
        for (const f of Object.keys(fields).sort((a, b) => a.localeCompare(b))) {
          lines.push(`- ${renderVariants(f, fields[f])}`);
        }
        lines.push("");
      }
      return lines.join(`
`).trimEnd();
    })();
    const glossaryMd = (() => {
      const lines = ["# glossary.md", ""];
      const terms = Object.keys(db.glossary).sort((a, b) => a.localeCompare(b));
      for (const term of terms) {
        const defs = db.glossary[term].definitions;
        lines.push(`## ${term}`);
        for (const d of defs)
          lines.push(`- ${d}`);
        if (defs.length > 1)
          lines.push("- (unresolved variants)");
        lines.push("");
      }
      return lines.join(`
`).trimEnd();
    })();
    const worldRulesMd = (() => {
      const lines = ["# world_rules.md", ""];
      const rules = Object.keys(db.world_rules).sort((a, b) => a.localeCompare(b));
      for (const r of rules) {
        lines.push(`## ${r}`);
        const vs = db.world_rules[r].variants;
        for (const v of vs)
          lines.push(`- ${v}`);
        if (vs.length > 1)
          lines.push("- (unresolved variants)");
        lines.push("");
      }
      return lines.join(`
`).trimEnd();
    })();
    const timelineMd = (() => {
      const lines = ["# timeline.md", ""];
      const keys = Object.keys(db.timeline).sort((a, b) => a.localeCompare(b));
      for (const k of keys) {
        const vs = db.timeline[k].variants;
        lines.push(`- ${renderVariants(k, vs)}`);
      }
      if (!keys.length)
        lines.push("(empty)");
      return lines.join(`
`).trimEnd();
    })();
    const watchlistMd = (() => {
      const lines = ["# continuity_watchlist.md", "", "## Open Conflicts", ""];
      const open = conflicts.filter((c) => c.status === "open");
      if (!open.length)
        return lines.concat(["(none)"]).join(`
`);
      for (const c of open) {
        const field = c.field ? `.${c.field}` : "";
        lines.push(`- [ ] ${c.kind}:${c.key}${field} => { ${c.variants.join(" | ")} }`);
      }
      return lines.join(`
`);
    })();
    return JSON.stringify({
      characters: charactersMd,
      locations: locationsMd,
      glossary: glossaryMd,
      world_rules: worldRulesMd,
      timeline: timelineMd,
      continuity_watchlist: watchlistMd,
      state: {
        canonDBPath: path12.join(projectDir, "canon_db.json"),
        conflictsPath: path12.join(projectDir, "canon_conflicts.json")
      }
    }, null, 2);
  }
});

// src/tools/index.ts
function makeTools(_params) {
  return {
    extract_canon: extractCanonTool,
    prose_diff: proseDiffTool,
    continuity_check: continuityCheckTool,
    build_style_profile: buildStyleProfileTool,
    set_project_language: setProjectLanguageTool,
    scan_manuscripts: scanManuscriptsTool,
    read_manuscript_chunk: readManuscriptChunkTool,
    canon_merge: canonMergeTool,
    canon_snapshot: canonSnapshotTool
  };
}

// src/plugin.ts
function normalizeOptions(options) {
  const o = options ?? {};
  return {
    installMode: o.installMode ?? "owned-only",
    backup: o.backup ?? "on-force",
    defaultLanguage: o.defaultLanguage
  };
}
async function maybeToast(client, body) {
  try {
    await client.tui.showToast({ body: { message: body.message, variant: body.variant ?? "info" } });
  } catch {}
}
async function backupFileIfNeeded(filePath, backupMode, isForce) {
  const shouldBackup = backupMode === "always" || backupMode === "on-force" && isForce;
  if (!shouldBackup)
    return;
  if (!await fileExists(filePath))
    return;
  const bak = `${filePath}.bak`;
  const content = await readText(filePath);
  await writeTextAtomic(bak, content);
}
async function installTemplates(params) {
  const { configRoot, options, version, client } = params;
  const assets = await listAssetFiles();
  const targets = [];
  for (const ap of assets) {
    if (ap.startsWith("agents/")) {
      targets.push({ assetPath: ap, destPath: path13.join(configRoot, "agents", path13.basename(ap)), kind: "agent" });
    } else if (ap.startsWith("commands/")) {
      targets.push({ assetPath: ap, destPath: path13.join(configRoot, "commands", path13.basename(ap)), kind: "command" });
    }
  }
  await ensureDir(path13.join(configRoot, "agents"));
  await ensureDir(path13.join(configRoot, "commands"));
  const manifest = await loadManifest(getStateDir(configRoot));
  manifest.version = version;
  manifest.files ??= [];
  const installed = [];
  const updated = [];
  const skipped = [];
  for (const t of targets) {
    const exists = await fileExists(t.destPath);
    if (!exists) {
      const raw2 = await readAssetText(t.assetPath);
      const stamped2 = stampOwnedFrontmatter(raw2, { version });
      await writeTextAtomic(t.destPath, stamped2);
      installed.push(t.destPath);
      manifest.files = manifest.files.filter((r) => r.path !== t.destPath);
      manifest.files.push({ path: t.destPath, asset: t.assetPath, kind: t.kind, version });
      continue;
    }
    if (options.installMode === "if-missing") {
      skipped.push(t.destPath);
      continue;
    }
    const current = await readText(t.destPath);
    const owned = isOwnedByOpenQuill(current);
    const isForce = options.installMode === "force";
    if (!owned && options.installMode !== "force") {
      skipped.push(t.destPath);
      continue;
    }
    const existing = manifest.files.find((r) => r.path === t.destPath);
    if (owned && existing?.version === version) {
      skipped.push(t.destPath);
      continue;
    }
    await backupFileIfNeeded(t.destPath, options.backup, isForce);
    const raw = await readAssetText(t.assetPath);
    const stamped = stampOwnedFrontmatter(raw, { version });
    await writeTextAtomic(t.destPath, stamped);
    updated.push(t.destPath);
    manifest.files = manifest.files.filter((r) => r.path !== t.destPath);
    manifest.files.push({ path: t.destPath, asset: t.assetPath, kind: t.kind, version });
  }
  await saveManifest(getStateDir(configRoot), manifest);
  if (installed.length || updated.length) {
    await maybeToast(client, { message: `Open Quill installed/updated writing templates (${installed.length} new, ${updated.length} updated)`, variant: "success" });
  }
  if (skipped.length) {
    await maybeToast(client, { message: `Open Quill skipped ${skipped.length} existing templates (name collisions)`, variant: "warning" });
  }
  return { installed, updated, skipped };
}
var openQuillServer = async (ctx, options) => {
  const o = normalizeOptions(options);
  const configRoot = detectConfigRoot();
  let version = "0.0.0";
  try {
    const pkgUrl = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(await Bun.file(pkgUrl).text());
    version = pkg.version ?? version;
  } catch {}
  const hooks = {
    tool: makeTools({ configRoot }),
    "experimental.chat.system.transform": async (_input, output) => {
      const prefs = await loadProjectPrefs(getStateDir(configRoot));
      const lang = prefs.languageByWorktree?.[ctx.worktree] ?? o.defaultLanguage;
      if (!lang)
        return;
      output.system.push(`Open Quill: Default output language for this project is "${lang}". Respond in this language unless the user explicitly requests otherwise.`);
    },
    "experimental.session.compacting": async (_input, output) => {
      const prefs = await loadProjectPrefs(getStateDir(configRoot));
      const lang = prefs.languageByWorktree?.[ctx.worktree] ?? o.defaultLanguage;
      if (lang) {
        output.context.push(`Open Quill: Project default output language is ${lang}.`);
      }
      output.context.push("Open Quill: You are operating in writing mode. Prefer preserving manuscript language and register. Canon/memory files (if present) are project_brief.md, summary.md, glossary.md, characters.md, locations.md, timeline.md, world_rules.md, style_profile.md, continuity_watchlist.md.");
    }
  };
  await ensureDir(getStateDir(configRoot));
  const result = await installTemplates({ configRoot, options: o, version, client: ctx.client });
  try {
    await ctx.client.app.log({
      body: {
        service: "open-quill",
        level: "info",
        message: "Templates install summary",
        extra: {
          version,
          installed: result.installed.map((p) => path13.relative(configRoot, p)),
          updated: result.updated.map((p) => path13.relative(configRoot, p)),
          skipped: result.skipped.map((p) => path13.relative(configRoot, p))
        }
      }
    });
  } catch {}
  return hooks;
};

// src/index.ts
var OpenQuill = openQuillServer;
var moduleExport = {
  id: "open-quill",
  server: openQuillServer
};
var src_default = moduleExport;
export {
  src_default as default,
  OpenQuill
};

//# debugId=C5A1567FF7E3F56264756E2164756E21
