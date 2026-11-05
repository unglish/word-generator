import type { Phoneme, Syllable, WordGenerationContext } from "../types.js";
import type { StressRules } from "../config/language.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import { isNucleusCompatibleWithCoda } from "./rime-compatibility.js";
import type { BannedNucleusCodaPairs } from "./rime-compatibility.js";

export interface WordEdges { initial: boolean; final: boolean }

/** Both flags can be true for a single segment with no onset or coda. */
export function nucleusWordEdges(
  syllable: Syllable,
  syllableIndex: number,
  syllableCount: number,
  nucleusIndex: number,
): WordEdges {
  return {
    initial: syllableIndex === 0 && syllable.onset.length === 0 && nucleusIndex === 0,
    final: syllableIndex === syllableCount - 1 && syllable.coda.length === 0 && nucleusIndex === syllable.nucleus.length - 1,
  };
}

/** A zero at either applicable edge wins over the other edge's positive weight. */
export function nucleusWordPositionWeight(phoneme: Phoneme, edges: WordEdges): number | undefined {
  const weights = phoneme.nucleusWordPosition;
  if (!weights) return undefined;
  if ((edges.initial && weights.initial <= 0) || (edges.final && weights.final <= 0)) return 0;
  if (edges.initial) return weights.initial;
  if (edges.final) return weights.final;
  return weights.medial;
}

export function isNucleusWordPositionAllowed(phoneme: Phoneme, edges: WordEdges): boolean {
  const weight = nucleusWordPositionWeight(phoneme, edges);
  return weight === undefined || weight > 0;
}

/** Revalidate realized base-word edges after coda repairs and stress replacement. */
export function repairNucleusWordPositions(
  context: WordGenerationContext,
  nucleusPhonemes: Phoneme[],
  stress: StressRules,
  bannedPairs?: BannedNucleusCodaPairs,
): void {
  const syllables = context.word.syllables;
  for (let si = 0; si < syllables.length; si++) {
    const syllable = syllables[si];
    for (let ni = 0; ni < syllable.nucleus.length; ni++) {
      const original = syllable.nucleus[ni];
      if (!original.nucleusWordPosition) continue;
      const edges = nucleusWordEdges(syllable, si, syllables.length, ni);
      if (isNucleusWordPositionAllowed(original, edges)) continue;

      const initialSyllable = si === 0;
      const finalSyllable = si === syllables.length - 1;
      const options: [Phoneme, number][] = [];
      let positivePairExclusions = 0;
      let totalWeight = 0;
      for (const candidate of nucleusPhonemes) {
        if (syllable.stress === "ˈ" && stress.nucleus.stressedNucleusBan?.includes(candidate.sound)) continue;
        let positionWeight = nucleusWordPositionWeight(candidate, edges);
        if (positionWeight === undefined) {
          if ((initialSyllable && candidate.startWord <= 0) || (finalSyllable && candidate.endWord <= 0)) continue;
          positionWeight = (initialSyllable && candidate.startWord) || (finalSyllable && candidate.endWord) || candidate.midWord || 1;
        }
        const weight = (candidate.nucleus ?? 0) * positionWeight;
        if (!Number.isFinite(weight) || weight <= 0) continue;
        if (!isNucleusCompatibleWithCoda(candidate.sound, syllable.coda, bannedPairs)) {
          positivePairExclusions++;
          continue;
        }
        options.push([candidate, weight]);
        totalWeight += weight;
      }
      if (options.length === 0 || !Number.isFinite(totalWeight)) {
        throw new Error("No eligible nucleus with finite positive weight for the realized lexical-root position and retained coda.");
      }
      const replacement = getWeightedOption(options, context.rand);
      syllable.nucleus[ni] = replacement;
      context.trace?.recordRepair("repairNucleusWordPositions", original.sound, replacement.sound,
        `base syllable ${si}, nucleus ${ni}; segment initial=${edges.initial}, final=${edges.final}`, {
          domain: "lexical-root", syllableIndex: si, nucleusIndex: ni,
          coda: syllable.coda.map(phoneme => phoneme.sound), edges, weighting: "nucleus-times-word-position",
          eligibleCandidateEntries: options.length, positivePairExclusions, totalWeight,
        });
    }
  }
}
