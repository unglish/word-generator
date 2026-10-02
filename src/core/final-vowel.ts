import type { FinalNucleusRules, StressRules } from "../config/language.js";
import type { Phoneme, Syllable, WordGenerationContext } from "../types.js";
import getWeightedOption from "../utils/getWeightedOption.js";

export function resolveFinalVowels(rules?: FinalNucleusRules): ReadonlySet<string> {
  const sounds = new Set<string>();
  for (const rule of rules?.checkedVowels ?? []) {
    if (!rule || typeof rule.sound !== "string" || !rule.sound || sounds.has(rule.sound)) {
      throw new Error("Final nucleus restrictions require unique nonempty sounds.");
    }
    sounds.add(rule.sound);
  }
  return sounds;
}

export function isFinalVowelAllowed(syllables: readonly Syllable[], syllableIndex: number,
  nucleusIndex: number, sound: string, checked: ReadonlySet<string>): boolean {
  const syllable = syllables[syllableIndex];
  return syllableIndex !== syllables.length - 1 || syllable.coda.length > 0
    || nucleusIndex !== syllable.nucleus.length - 1 || !checked.has(sound);
}

export function assertFinalVowelAllowed(syllables: readonly Syllable[], checked: ReadonlySet<string>): void {
  const si = syllables.length - 1;
  const last = syllables.at(-1);
  if (!last?.nucleus.length) return;
  const ni = last.nucleus.length - 1;
  if (!isFinalVowelAllowed(syllables, si, ni, syllables[si].nucleus[ni].sound, checked)) {
    throw new Error("Configured final vowel requires a following coda.");
  }
}

/** Repair an unalternated root nucleus before its spelling is written. */
export function repairFinalCheckedVowel(context: WordGenerationContext, root: readonly Syllable[],
  rootStart: number, before: readonly Phoneme[][], pool: readonly Phoneme[], stress: StressRules,
  checked: ReadonlySet<string>): void {
  const syllables = context.word.syllables;
  const si = syllables.length - 1;
  const last = syllables.at(-1);
  if (!last?.nucleus.length) return;
  const ni = last.nucleus.length - 1;
  const original = syllables[si].nucleus[ni];
  if (isFinalVowelAllowed(syllables, si, ni, original.sound, checked)) return;
  const source = root[si - rootStart]?.nucleus[ni];
  if (!source || source.sound !== before[si][ni]?.sound) {
    throw new Error("Final checked vowel belongs to an affix or derived alternation; configure a legal realization.");
  }
  const eligible: [Phoneme, number][] = [];
  const initial = si === 0 && syllables[si].onset.length === 0 && ni === 0;
  for (const candidate of pool) {
    if (checked.has(candidate.sound) || (initial && candidate.startWord <= 0)) continue;
    if (syllables[si].stress === "ˈ" && stress.nucleus.stressedNucleusBan?.includes(candidate.sound)) continue;
    const weight = (candidate.nucleus ?? 0) * candidate.endWord;
    if (Number.isFinite(weight) && weight > 0) eligible.push([candidate, weight]);
  }
  const total = eligible.reduce((sum, [, weight]) => sum + weight, 0);
  if (!eligible.length || !Number.isFinite(total)) {
    throw new Error("No eligible final nucleus with finite positive weight.");
  }
  const replacement = getWeightedOption(eligible, context.rand);
  syllables[si].nucleus[ni] = replacement;
  context.trace?.recordRepair("repairFinalCheckedVowel", original.sound, replacement.sound,
    `root nucleus ${si}:${ni}; open word end; nucleus-times-endWord weight; ${eligible.length} eligible entries`);
}
