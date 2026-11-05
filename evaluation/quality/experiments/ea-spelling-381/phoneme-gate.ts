/**
 * Issue #381: the phoneme-quality gate sample (src/config/phoneme-thresholds.json),
 * with per-phoneme generated shares so main and branch can be diffed.
 *
 *   node --import tsx evaluation/quality/experiments/ea-spelling-381/phoneme-gate.ts > out.json
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generateWords } from "../../../../src/core/generate.js";
import { computePhonemeQualityMetrics } from "../../../../src/core/phoneme-quality.js";
import { countNormalizedPhonemes, type PhonemeNormalization } from "../../../../src/core/phoneme-normalization.js";

const root = join(import.meta.dirname, "..", "..", "..", "..");
const load = <T>(...parts: string[]): T => JSON.parse(readFileSync(join(root, ...parts), "utf8")) as T;
const thresholds = load<{ sampleSize: number; seed: number; minCommonBaselinePct: number }>("src", "config", "phoneme-thresholds.json");
const normalization = load<PhonemeNormalization>("data", "cmu", "phoneme-normalization.json");
const baseline = load<Record<string, number>>("data", "cmu", "cmu-lexicon-phonemes.json");

const words = generateWords(thresholds.sampleSize, { seed: thresholds.seed, mode: "lexicon", morphology: false });
const { counts } = countNormalizedPhonemes(words, normalization);
const metrics = computePhonemeQualityMetrics(counts, baseline, thresholds.minCommonBaselinePct);
const total = Object.values(counts).reduce((a, b) => a + b, 0);
const letters = words.reduce((sum, w) => sum + w.written.clean.length, 0);
const syllables = words.reduce((sum, w) => sum + w.syllables.length, 0);
console.log(JSON.stringify({
  pearson: metrics.sharedPearsonR,
  worstOver: metrics.topOverRepresented[0], worstUnder: metrics.topUnderRepresented[0],
  meanLetters: letters / words.length, meanSyllables: syllables / words.length, phonemesPerWord: total / words.length,
  sharePct: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, 100 * v / total])),
}, null, 1));
