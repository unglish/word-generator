import { Phoneme, WordGenerationContext } from "../types.js";
import { StressRules } from "../config/language.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import { isNucleusWordPositionAllowed, nucleusWordEdges } from "./nucleus-position.js";
import { isNucleusCompatibleWithCoda } from "./rime-compatibility.js";
import type { BannedNucleusCodaPairs } from "./rime-compatibility.js";

/**
 * After stress assignment, re-pick any nucleus whose sound is banned under
 * primary stress (e.g. schwa /ə/ should not carry primary stress in English).
 *
 * Monosyllables are unaffected because `applyPrimaryStress` skips them
 * (no stress marker is assigned), so the ban naturally does not apply.
 */
export function repairStressedNuclei(
  context: WordGenerationContext,
  nucleusPhonemes: Phoneme[],
  stress: StressRules,
  bannedPairs?: BannedNucleusCodaPairs,
): void {
  const ban = stress.nucleus.stressedNucleusBan;
  if (!ban || ban.length === 0) return;

  const banSet = new Set(ban);

  // Pre-filter the pool once — remove banned sounds
  const allowed = nucleusPhonemes.filter(p => !banSet.has(p.sound));

  const weightedAllowed: [Phoneme, number][] = allowed.map(p => [p, p.nucleus ?? 1]);

  for (const [syllableIndex, syllable] of context.word.syllables.entries()) {
    if (syllable.stress !== "ˈ") continue;

    const nucleus = syllable.nucleus[0];
    if (!nucleus || !banSet.has(nucleus.sound)) continue;

    const before = nucleus.sound;
    const edges = nucleusWordEdges(syllable, syllableIndex, context.word.syllables.length, 0);
    const eligible: [Phoneme, number][] = [];
    let positivePairExclusions = 0;
    let totalWeight = 0;
    for (const [phoneme, weight] of weightedAllowed) {
      if (!Number.isFinite(weight) || weight <= 0 || !isNucleusWordPositionAllowed(phoneme, edges)) continue;
      if (!isNucleusCompatibleWithCoda(phoneme.sound, syllable.coda, bannedPairs)) {
        positivePairExclusions++;
        continue;
      }
      eligible.push([phoneme, weight]);
      totalWeight += weight;
    }
    if (eligible.length === 0 || !Number.isFinite(totalWeight)) {
      throw new Error("No eligible stressed nucleus with finite positive weight for the realized lexical-root position and retained coda.");
    }
    syllable.nucleus[0] = getWeightedOption(eligible, context.rand);
    context.trace?.recordRepair("repairStressedNuclei", before, syllable.nucleus[0].sound,
      `replaced banned stressed nucleus /${before}/`, {
        domain: "lexical-root", syllableIndex, nucleusIndex: 0,
        coda: syllable.coda.map(phoneme => phoneme.sound), edges, weighting: "nucleus-only",
        eligibleCandidateEntries: eligible.length, positivePairExclusions, totalWeight,
      });
  }

  // Future: unstressedNucleusBoost — config is read but no behaviour change yet
  // const _boost = stress.nucleus.unstressedNucleusBoost;
}
