import type { StressNucleusRules } from "../config/language.js";
import type { Syllable, WordGenerationContext } from "../types.js";

export function allowsSecondaryStress(
  syllable: Syllable,
  rules: StressNucleusRules,
): boolean {
  const { secondaryStressBan } = rules;
  return !secondaryStressBan?.length ||
    !syllable.nucleus.some(({ sound }) => secondaryStressBan.includes(sound));
}

/** Nucleus replacement and affix stress can invalidate lexical secondary stress. */
export function clearBannedSecondaryStress(
  context: WordGenerationContext,
  rules: StressNucleusRules,
): void {
  if (!rules.secondaryStressBan?.length) return;
  for (const [index, syllable] of context.word.syllables.entries()) {
    if (syllable.stress !== "ˌ" || allowsSecondaryStress(syllable, rules)) continue;
    syllable.stress = undefined;
    context.trace?.recordRepair(
      "clearBannedSecondaryStress",
      "ˌ",
      "",
      `syllable ${index}: /${syllable.nucleus.map(({ sound }) => sound).join("")}/`,
    );
  }
}
