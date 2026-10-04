import type { LanguageConfig } from "../../src/config/language.js";
import { validateFrequencyCounts, type FrequencyCounts } from "./frequency-model.js";

export interface FrequencyRuntimeSupport {
  phonemeCounts: readonly number[];
  syllableCounts: readonly number[];
}
export interface UnsupportedFrequencyCell {
  phonemeCount: number;
  syllableCount: number;
  mass: number;
  lengthSupported: boolean;
  syllablesSupported: boolean;
}

function supportSet(values: readonly number[]): ReadonlySet<number> {
  if (!values.length || values.some(value => !Number.isSafeInteger(value) || value <= 0)
    || new Set(values).size !== values.length) throw new Error("Runtime target support requires unique positive integers.");
  return new Set(values);
}

/** Keep unsupported source mass visible before conditioning the generation tables. */
export function frequencyRuntimeTargets(model: FrequencyCounts, support: FrequencyRuntimeSupport) {
  validateFrequencyCounts(model);
  if (model.weighting !== "tokens") throw new Error("Running-text targets require token-weighted training counts.");
  const lengths = supportSet(support.phonemeCounts);
  const syllables = supportSet(support.syllableCounts);
  const lengthWeights: [number, number][] = [];
  const syllableWeights: Record<number, [number, number][]> = {};
  const unsupported: UnsupportedFrequencyCell[] = [];
  let eligibleMass = 0;
  let unsupportedMass = 0;
  for (const length of Object.keys(model.syllablesByLength).map(Number).sort((a, b) => a - b)) {
    const retained: [number, number][] = [];
    const lengthSupported = lengths.has(length);
    for (const count of Object.keys(model.syllablesByLength[length]).map(Number).sort((a, b) => a - b)) {
      const mass = model.syllablesByLength[length][count];
      const syllablesSupported = syllables.has(count);
      if (lengthSupported && syllablesSupported) {
        retained.push([count, mass]);
        eligibleMass += mass;
      } else {
        unsupported.push({ phonemeCount: length, syllableCount: count, mass, lengthSupported, syllablesSupported });
        unsupportedMass += mass;
      }
    }
    if (retained.length) {
      lengthWeights.push([length, retained.reduce((total, [, mass]) => total + mass, 0)]);
      syllableWeights[length] = retained;
    }
  }
  if (!eligibleMass) throw new Error("No training token mass is eligible for the declared runtime support.");
  if (eligibleMass + unsupportedMass !== model.wordMass) throw new Error("Runtime target mass does not reconcile.");
  return { version: "frequency-runtime-targets-v1" as const, lengthWeights, syllableWeights,
    sourceMass: model.wordMass, eligibleMass, unsupportedMass, unsupported,
    support: { phonemeCounts: [...lengths].sort((a, b) => a - b), syllableCounts: [...syllables].sort((a, b) => a - b) },
    interpretation: "Generation is conditioned on eligible integer training token mass; unsupported mass remains reported. Citation lengths are targets, not guaranteed output lengths." };
}

/** Explicit opt-in; no generator defaults, lexicon targets or phone inventories change. */
export function createFrequencyTextConfig(config: LanguageConfig, model: FrequencyCounts) {
  const phonemeCounts = config.phonemeLengthWeights.text.filter(([, weight]) => weight > 0).map(([count]) => count);
  const syllableCounts = [...new Set(Object.values(config.phonemeToSyllableWeights.text)
    .flatMap(row => row.filter(([, weight]) => weight > 0).map(([count]) => count)))];
  const targets = frequencyRuntimeTargets(model, { phonemeCounts, syllableCounts });
  const rootPriorRows: Array<{ phonemeCount: number; weights: [number, number][]; source: string }> = [];
  const operationalRows = Object.fromEntries(Object.entries(targets.syllableWeights).map(([length, row]) =>
    [length, row.map(([count, mass]): [number, number] => [count, mass])]));
  for (const length of targets.support.phonemeCounts) {
    if (operationalRows[length]) continue;
    const weights: [number, number][] = targets.support.syllableCounts
      .filter(count => count <= length).map(count => [count, 1]);
    if (!weights.length) throw new Error("No configured syllable support for a reachable root target length.");
    operationalRows[length] = weights;
    rootPriorRows.push({ phonemeCount: length, weights: weights.map(([count, mass]) => [count, mass]),
      source: "registered uniform conditional base conditioned on configured syllable support; not observed token counts" });
  }
  const configured: LanguageConfig = { ...config,
    phonemeLengthWeights: { ...config.phonemeLengthWeights, text: targets.lengthWeights.map(([length, mass]) => [length, mass]) },
    phonemeToSyllableWeights: { ...config.phonemeToSyllableWeights,
      text: operationalRows },
  };
  return { config: configured, targets: { ...targets, rootPriorRows } };
}
