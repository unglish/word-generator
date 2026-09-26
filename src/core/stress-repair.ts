import { Phoneme, WordGenerationContext } from "../types.js";
import { StressRules } from "../config/language.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import { isNucleusWordPositionAllowed, nucleusWordEdges } from "./nucleus-position.js";

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
): void {
  const ban = stress.nucleus.stressedNucleusBan;
  if (!ban || ban.length === 0) return;

  const banSet = new Set(ban);

  // Pre-filter the pool once — remove banned sounds
  const allowed = nucleusPhonemes.filter(p => !banSet.has(p.sound));
  if (allowed.length === 0) return; // nothing to pick from

  const weightedAllowed: [Phoneme, number][] = allowed.map(p => [p, p.nucleus ?? 1]);

  for (const [syllableIndex, syllable] of context.word.syllables.entries()) {
    if (syllable.stress !== "ˈ") continue;

    const nucleus = syllable.nucleus[0];
    if (!nucleus || !banSet.has(nucleus.sound)) continue;

    const before = nucleus.sound;
    // Re-pick from filtered pool
    const edges = nucleusWordEdges(syllable, syllableIndex, context.word.syllables.length, 0);
    const eligible = weightedAllowed.filter(([phoneme]) => isNucleusWordPositionAllowed(phoneme, edges));
    if (eligible.length === 0) throw new Error("No eligible stressed nucleus for the realized base-word segment position.");
    syllable.nucleus[0] = getWeightedOption(eligible, context.rand);
    context.trace?.recordRepair("repairStressedNuclei", before, syllable.nucleus[0].sound, `replaced banned stressed nucleus /${before}/`);
  }

  // Future: unstressedNucleusBoost — config is read but no behaviour change yet
  // const _boost = stress.nucleus.unstressedNucleusBoost;
}
