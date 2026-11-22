import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { lexiconReference } from "../config/lexicon-reference.js";
import { generateWords } from "../index.js";
import { countNormalizedPhonemes } from "./phoneme-normalization.js";
import { readFileSync } from "node:fs";
import { toPercentMap, totalVariationPct } from "./distribution-quality.js";

const templates = ["bare", "suffixed", "prefixed", "both"] as const;
const sum = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);
const meanSyllables = (counts: Record<string, number>) =>
  Object.entries(counts).reduce((sum, [count, weight]) => sum + Number(count) * weight, 0) / sum(counts);
const distance = (a: Record<string, number>, b: Record<string, number>) => totalVariationPct(toPercentMap(a), toPercentMap(b));

describe("lexicon stage references", () => {
  it("recomposes the representable surface syllable table from configured root budgets and measured morphology", () => {
    const morphology = englishConfig.morphology!;
    const calibration = morphology.templateWeights.lexiconCalibration!;
    const extraSyllables: Record<string, Record<string, number>> = lexiconReference.additionalSyllables;
    const predicted: Record<string, number> = {};
    for (const [phones, phoneWeight] of englishConfig.phonemeLengthWeights.lexicon) {
      const syllableWeights = englishConfig.phonemeToSyllableWeights.lexicon[phones];
      const totalSyllableWeight = syllableWeights.reduce((sum, [, weight]) => sum + weight, 0);
      for (const [root, syllableWeight] of syllableWeights) {
        const rootMass = phoneWeight * syllableWeight / totalSyllableWeight;
        const row = calibration.byRootSyllables[root];
        for (const template of templates) {
          const weight = row[template];
          if (!weight) continue;
          const morphologyMass = rootMass * weight / sum(row);
          const deltas = extraSyllables[`${root}:${template}`];
          for (const [delta, count] of Object.entries(deltas)) {
            const surface = root + Number(delta);
            predicted[surface] = (predicted[surface] ?? 0) + morphologyMass * count / sum(deltas);
          }
        }
      }
    }
    // The representable cohort must agree up to arithmetic roundoff. The full
    // common cohort also includes stacked affixes and irregular residue.
    expect(distance(predicted, lexiconReference.representable.syllables)).toBeLessThan(1e-9);
    expect(distance(predicted, lexiconReference.common.syllables)).toBeLessThan(1);
  });

  it("keeps finished words near the common surface syllable distribution and measured template mix", () => {
    const words = generateWords(20_000, { seed: 20261121, mode: "lexicon", morphology: true, trace: true });
    const syllables: Record<string, number> = {};
    const templateCounts: Record<string, number> = {};
    const rootCodas: Record<string, number> = {};
    const affixes = { prefix: new Map<string, number>(), suffix: new Map<string, number>() };
    for (const word of words) {
      const count = word.syllables.length;
      syllables[count] = (syllables[count] ?? 0) + 1;
      const morphology = word.trace!.morphology!;
      const template = morphology.template;
      for (const type of ["prefix", "suffix"] as const) {
        const affix = morphology[type];
        if (affix) affixes[type].set(affix, (affixes[type].get(affix) ?? 0) + 1);
      }
      templateCounts[template] = (templateCounts[template] ?? 0) + 1;
      const coda = word.trace!.stages.find(stage => stage.name === "repairNucleusWordPositions")!.after.at(-1)!.coda.join(",");
      rootCodas[coda] = (rootCodas[coda] ?? 0) + 1;
    }
    expect(distance(syllables, lexiconReference.common.syllables)).toBeLessThan(2.25);
    expect(Math.abs(meanSyllables(syllables) - meanSyllables(lexiconReference.common.syllables))).toBeLessThan(0.05);
    expect(distance(templateCounts, lexiconReference.templates)).toBeLessThan(1.5);
    const referenceSize = sum(lexiconReference.templates);
    for (const type of ["prefix", "suffix"] as const) {
      for (const [affix, count] of Object.entries(lexiconReference.affixes[type])) {
        const probability = count / referenceSize;
        const observed = affixes[type].get(affix) ?? 0;
        const tolerance = 1 + 5 * Math.sqrt(words.length * probability * (1 - probability));
        expect(Math.abs(observed - probability * words.length), `${type} ${affix}`).toBeLessThan(tolerance);
      }
    }
    const normalization = JSON.parse(readFileSync(new URL("../../data/cmu/phoneme-normalization.json", import.meta.url), "utf8"));
    const { counts, losses } = countNormalizedPhonemes(words, normalization);
    expect(losses).toEqual({});
    expect(Object.keys(counts).sort()).toEqual(Object.keys(lexiconReference.common.phones).sort());
    expect(distance(counts, lexiconReference.common.phones)).toBeLessThan(5.8);
    expect(distance(rootCodas, englishConfig.lexiconFinalCodas!.weights)).toBeLessThan(3);
    expect(Object.keys(rootCodas).filter(coda => !(coda in englishConfig.lexiconFinalCodas!.weights))).toEqual([]);
  }, 30_000);
});
