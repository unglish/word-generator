import { Phoneme, Syllable, WordGenerationContext } from "../types.js";
import { StressRules } from "../config/language.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import {
  isCheckedOpenFinalAllowed,
  isNucleusWordPositionAllowed,
  nucleusWordEdges,
} from "./nucleus-position.js";
import {
  isNucleusCompatibleWithCoda,
  isNucleusCompatibleWithFollowingOnset,
} from "./rime-compatibility.js";
import type { BannedNucleusCodaPairs } from "./rime-compatibility.js";

/**
 * After stress assignment, re-pick any nucleus whose sound is banned under
 * primary stress (e.g. schwa /ə/ should not carry primary stress in English).
 *
 * Lexical monosyllables carry internal primary stress even when their IPA
 * display omits the stress mark. They obey the same nucleus restrictions.
 */
export function repairStressedNuclei(
  context: WordGenerationContext,
  nucleusPhonemes: Phoneme[],
  stress: StressRules,
  bannedPairs?: BannedNucleusCodaPairs,
  retainedRoot?: { syllables: readonly Syllable[]; start: number },
  followingOnsetPairs?: BannedNucleusCodaPairs,
  forbidOpenCheckedFinal = false,
): void {
  const ban = stress.nucleus.stressedNucleusBan;
  if (!ban || ban.length === 0) return;

  const banSet = new Set(ban);

  const allowed = nucleusPhonemes.filter((p) => !banSet.has(p.sound));

  const weightedAllowed: [Phoneme, number][] = allowed.map((p) => [
    p,
    p.nucleus ?? 1,
  ]);

  for (const [syllableIndex, syllable] of context.word.syllables.entries()) {
    if (syllable.stress !== "ˈ") continue;

    const nucleus = syllable.nucleus[0];
    if (!nucleus || !banSet.has(nucleus.sound)) continue;

    // Final stress operates on the assembled word, but only root replacements
    // are copied back before root spelling. Keep affix legality out of this rule.
    const rootIndex = syllableIndex - (retainedRoot?.start ?? 0);
    const rootSyllable = retainedRoot
      ? retainedRoot.syllables[rootIndex]
      : syllable;
    const coda = rootSyllable?.coda ?? syllable.coda;
    const pairRules = rootSyllable ? bannedPairs : undefined;
    // Only a following root syllable counts; affix joins are exempt.
    const nextOnset = retainedRoot
      ? retainedRoot.syllables[rootIndex + 1]?.onset
      : context.word.syllables[syllableIndex + 1]?.onset;
    const onsetRules = rootSyllable ? followingOnsetPairs : undefined;
    const before = nucleus.sound;
    const edges = nucleusWordEdges(
      syllable,
      syllableIndex,
      context.word.syllables.length,
      0,
    );
    const eligible: [Phoneme, number][] = [];
    let positivePairExclusions = 0;
    let totalWeight = 0;
    for (const [phoneme, weight] of weightedAllowed) {
      if (
        !Number.isFinite(weight) ||
        weight <= 0 ||
        !isNucleusWordPositionAllowed(phoneme, edges) ||
        (forbidOpenCheckedFinal && !isCheckedOpenFinalAllowed(phoneme, edges))
      )
        continue;
      if (
        !isNucleusCompatibleWithCoda(phoneme.sound, coda, pairRules) ||
        !isNucleusCompatibleWithFollowingOnset(
          phoneme.sound,
          coda,
          nextOnset,
          onsetRules,
        )
      ) {
        positivePairExclusions++;
        continue;
      }
      eligible.push([phoneme, weight]);
      totalWeight += weight;
    }
    if (eligible.length === 0 || !Number.isFinite(totalWeight)) {
      throw new Error(
        "No eligible stressed nucleus with finite positive weight for the realized lexical-root position and retained coda.",
      );
    }
    syllable.nucleus[0] = getWeightedOption(eligible, context.rand);
    context.trace?.recordRepair(
      retainedRoot ? "repairFinalStressedNuclei" : "repairStressedNuclei",
      before,
      syllable.nucleus[0].sound,
      `replaced banned stressed nucleus /${before}/`,
      rootSyllable
        ? {
          domain: "lexical-root",
          syllableIndex: rootIndex,
          nucleusIndex: 0,
          coda: coda.map((phoneme) => phoneme.sound),
          edges,
          weighting: "nucleus-only",
          eligibleCandidateEntries: eligible.length,
          positivePairExclusions,
          totalWeight,
        }
        : undefined,
    );
  }
}
