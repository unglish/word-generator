#!/usr/bin/env tsx

/**
 * Targeted issue-85 funnel probe.
 *
 * This is a focused diagnostic for productive `of` coverage. It disables any
 * of-specific gap-spelling overrides so the output reflects the generator's
 * structural and writer paths rather than lexical patches.
 */
import { createGenerator, createSeededRng, englishConfig } from "../src/index.js";
import type { GenerationMode, Word } from "../src/types.js";
import type { SyllableSnapshot } from "../src/core/trace.js";

type ProbeStats = {
  count: number;
  firstSeenGeneration: number | null;
  firstSeenWord: string | null;
  firstSeenPronunciation: string | null;
  firstSeenTemplate: string | null;
};

const DEFAULT_SEED = 85;
const DEFAULT_COUNT = 100_000;
const FUNNEL_LABELS = [
  "targetPhonemeCount=2",
  "targetPhonemeCount=2 + syllableCount=1",
  "targetPhonemeCount=2 + VC plan",
  "realized root VC",
] as const;
const TRACKED_VOWELS = ["ɔ", "ɑ", "ʌ", "ə"] as const;
const TRACKED_CODAS = ["f", "v"] as const;
const TRACKED_SHAPES = ["ɔ|f", "ɑ|f", "ʌ|f", "ə|f", "ɔ|v", "ɑ|v", "ʌ|v", "ə|v"] as const;
const TRACKED_SURFACES = ["of", "off", "ofe", "ove", "eve", "af", "ave"] as const;

function parseArgs(argv: string[]) {
  let seed = DEFAULT_SEED;
  let count = DEFAULT_COUNT;
  let mode: GenerationMode = "lexicon";
  let morphology = true;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--seed") {
      seed = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--count") {
      count = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--mode") {
      const value = argv[i + 1];
      if (value !== "lexicon" && value !== "text") {
        throw new Error(`Unsupported mode "${value}". Use "lexicon" or "text".`);
      }
      mode = value;
      i += 1;
    } else if (arg === "--morphology") {
      const value = argv[i + 1];
      if (value !== "true" && value !== "false") {
        throw new Error(`Unsupported morphology flag "${value}". Use true or false.`);
      }
      morphology = value === "true";
      i += 1;
    } else {
      throw new Error(`Unknown argument "${arg}"`);
    }
  }

  if (!Number.isInteger(seed)) {
    throw new Error("--seed must be an integer");
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("--count must be a positive integer");
  }

  return { seed, count, mode, morphology };
}

function makeStatsMap(keys: readonly string[]): Map<string, ProbeStats> {
  return new Map(keys.map((key) => [key, {
    count: 0,
    firstSeenGeneration: null,
    firstSeenWord: null,
    firstSeenPronunciation: null,
    firstSeenTemplate: null,
  }]));
}

function recordHit(stats: ProbeStats, generation: number, word: Word) {
  stats.count += 1;
  if (stats.firstSeenGeneration === null) {
    stats.firstSeenGeneration = generation;
    stats.firstSeenWord = word.written.clean;
    stats.firstSeenPronunciation = word.pronunciation;
    stats.firstSeenTemplate = word.trace?.morphology?.template ?? "none";
  }
}

function getRootStage(word: Word): SyllableSnapshot[] | null {
  return word.trace?.stages.find((stage) => stage.name === "generateSyllables")?.after ?? null;
}

function isVcSyllable(syllables: SyllableSnapshot[] | null): boolean {
  if (!syllables || syllables.length !== 1) return false;
  const [syllable] = syllables;
  return syllable.onset.length === 0 && syllable.nucleus.length === 1 && syllable.coda.length === 1;
}

function getRootVcSyllable(word: Word): SyllableSnapshot | null {
  const rootStage = getRootStage(word);
  if (!isVcSyllable(rootStage)) return null;
  return rootStage![0];
}

function classifyRootShape(word: Word): string | null {
  const syllable = getRootVcSyllable(word);
  if (!syllable) return null;
  const key = `${syllable.nucleus[0]}|${syllable.coda[0]}`;
  return TRACKED_SHAPES.includes(key as typeof TRACKED_SHAPES[number]) ? key : null;
}

function isOnsetlessMonosyllable(word: Word): boolean {
  return word.syllables.length === 1 && word.syllables[0].onset.length === 0;
}

function formatStats(label: string, stats: ProbeStats): string {
  const firstSeen = stats.firstSeenGeneration === null
    ? "never"
    : `${stats.firstSeenGeneration.toLocaleString()} (${stats.firstSeenWord} / ${stats.firstSeenPronunciation} / template=${stats.firstSeenTemplate})`;
  return `- ${label}: ${stats.count.toLocaleString()} hits; first seen ${firstSeen}`;
}

function incrementCount(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function formatMarginal(label: string, count: number, total: number): string {
  const percentage = total === 0 ? 0 : (count / total) * 100;
  return `- ${label}: ${count.toLocaleString()} hits (${percentage.toFixed(2)}% of realized root VC)`;
}

function formatExpectedPair(label: string, actual: number, expected: number): string {
  const ratio = expected > 0 ? actual / expected : 0;
  return `- ${label}: actual ${actual.toLocaleString()}, expected ${expected.toFixed(2)}, ratio ${ratio.toFixed(2)}`;
}

function main() {
  const { seed, count, mode, morphology } = parseArgs(process.argv.slice(2));
  const config = {
    ...englishConfig,
    gapSpellings: (englishConfig.gapSpellings ?? []).filter((entry) => !entry.name.startsWith("of-")),
  };
  const generator = createGenerator(config);
  const rand = createSeededRng(seed);
  const funnelStats = makeStatsMap(FUNNEL_LABELS);
  const rootShapeStats = makeStatsMap(TRACKED_SHAPES);
  const surfaceStats = makeStatsMap(TRACKED_SURFACES);
  const vowelCounts = new Map<string, number>();
  const codaCounts = new Map<string, number>();
  let finalOnsetlessMonosyllables = 0;

  for (let generation = 1; generation <= count; generation += 1) {
    const word = generator.generateWord({ rand, mode, morphology, trace: true });
    const trace = word.trace;
    if (!trace) {
      throw new Error("Expected trace data from probe generation");
    }
    if (isOnsetlessMonosyllable(word)) {
      finalOnsetlessMonosyllables += 1;
    }

    if (trace.targetPhonemeCount === 2) {
      recordHit(funnelStats.get("targetPhonemeCount=2")!, generation, word);
      if (trace.syllableCount === 1) {
        recordHit(funnelStats.get("targetPhonemeCount=2 + syllableCount=1")!, generation, word);
      }
      if (trace.syllablePlans?.length === 1 && trace.syllablePlans[0].onsetLength === 0 && trace.syllablePlans[0].codaLength === 1) {
        recordHit(funnelStats.get("targetPhonemeCount=2 + VC plan")!, generation, word);
      }
    }

    const rootVc = getRootVcSyllable(word);
    if (rootVc) {
      recordHit(funnelStats.get("realized root VC")!, generation, word);
      incrementCount(vowelCounts, rootVc.nucleus[0]);
      incrementCount(codaCounts, rootVc.coda[0]);
    }

    const rootShape = classifyRootShape(word);
    if (rootShape) {
      recordHit(rootShapeStats.get(rootShape)!, generation, word);
    }

    const surface = surfaceStats.get(word.written.clean);
    if (surface) {
      recordHit(surface, generation, word);
    }
  }

  console.log("issue-85-of-probe");
  console.log(`- Seed: ${seed}`);
  console.log(`- Count: ${count.toLocaleString()}`);
  console.log(`- Mode: ${mode}`);
  console.log(`- Morphology: ${morphology}`);
  console.log(`- Gap spellings: ${(config.gapSpellings ?? []).length} active (no of-specific overrides)`);
  console.log(`- Final onsetless monosyllables: ${finalOnsetlessMonosyllables.toLocaleString()}`);
  console.log("- Plan funnel:");
  for (const label of FUNNEL_LABELS) {
    console.log(formatStats(label, funnelStats.get(label)!));
  }
  console.log("- Root-stage shapes:");
  for (const label of TRACKED_SHAPES) {
    console.log(formatStats(label, rootShapeStats.get(label)!));
  }
  const realizedRootVc = funnelStats.get("realized root VC")!.count;
  console.log("- VC vowel marginals:");
  for (const vowel of TRACKED_VOWELS) {
    console.log(formatMarginal(vowel, vowelCounts.get(vowel) ?? 0, realizedRootVc));
  }
  console.log("- VC coda marginals:");
  for (const coda of TRACKED_CODAS) {
    console.log(formatMarginal(coda, codaCounts.get(coda) ?? 0, realizedRootVc));
  }
  console.log("- VC pair expectation check:");
  for (const label of TRACKED_SHAPES) {
    const [vowel, coda] = label.split("|");
    const expected = realizedRootVc === 0
      ? 0
      : ((vowelCounts.get(vowel) ?? 0) * (codaCounts.get(coda) ?? 0)) / realizedRootVc;
    console.log(formatExpectedPair(label, rootShapeStats.get(label)!.count, expected));
  }
  console.log("- Surfaces:");
  for (const label of TRACKED_SURFACES) {
    console.log(formatStats(label, surfaceStats.get(label)!));
  }
}

main();
