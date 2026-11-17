import { writeFileSync, mkdirSync } from "node:fs";
import { createGenerator, englishConfig, createSeededRng } from "../../src/index.js";
import type { LanguageConfig } from "../../src/types.js";

const outDir = process.env.OUT_DIR ?? "/tmp/issue-450-diagnosis/packets";
mkdirSync(outDir, { recursive: true });
const ungated = process.env.UNGATED === "1";
const n = Number(process.env.N ?? 5000);
const seed = Number(process.env.SEED ?? 42);

const config: LanguageConfig = ungated
  ? { ...englishConfig, syllableStructure: { ...englishConfig.syllableStructure, letterLengthTargets: undefined } }
  : englishConfig;
const gen = createGenerator(config);
const rand = createSeededRng(seed);

const byPosition: Record<string, { phones: number; letters: number; multi: number }> = {
  onset: { phones: 0, letters: 0, multi: 0 },
  nucleus: { phones: 0, letters: 0, multi: 0 },
  coda: { phones: 0, letters: 0, multi: 0 },
};
let kept = 0;
let phonesObserved = 0;
let multi = 0;
const graphemeLen: Record<string, number> = {};

while (kept < n) {
  const word = gen.generateWord({ rand, mode: "lexicon", morphology: false, trace: true });
  if (word.syllables.length !== 1) continue;
  kept++;
  for (const g of word.trace?.graphemeSelections ?? []) {
    const form = g.emitted || g.selected || "";
    const len = form.length;
    if (!len) continue;
    phonesObserved++;
    graphemeLen[String(len)] = (graphemeLen[String(len)] ?? 0) + 1;
    if (len > 1) multi++;
    if (g.position === "onset" || g.position === "nucleus" || g.position === "coda") {
      byPosition[g.position].phones++;
      byPosition[g.position].letters += len;
      if (len > 1) byPosition[g.position].multi++;
    }
  }
}

const totalG = Object.values(graphemeLen).reduce((a, b) => a + b, 0);
const packet = {
  ungated,
  seed,
  n: kept,
  phonesObserved,
  multiLetterShare: phonesObserved ? multi / phonesObserved : null,
  graphemeLenPct: Object.fromEntries(
    Object.entries(graphemeLen).map(([k, v]) => [k, (100 * v) / totalG]),
  ),
  byPosition,
  meanLettersPerPhoneByPosition: Object.fromEntries(
    Object.entries(byPosition).map(([k, v]) => [
      k,
      v.phones ? { mean: v.letters / v.phones, multiShare: v.multi / v.phones } : null,
    ]),
  ),
};
writeFileSync(`${outDir}/trace-${ungated ? "ungated" : "gated"}.json`, JSON.stringify(packet, null, 2));
console.log(JSON.stringify(packet, null, 2));
