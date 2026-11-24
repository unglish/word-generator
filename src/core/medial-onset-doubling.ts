import type { LanguageConfig } from "../config/language.js";
import type { Syllable, WordGenerationContext } from "../types.js";
import { createSeededRng } from "../utils/random.js";
import { isVowelChar } from "../utils/letters.js";
import type { BaseSpelling } from "./base-spelling.js";
import { scoreLetterLength } from "./length-semantics.js";
import { measureSpellingBudgets } from "./spelling-budget.js";
import { createDoublingModel } from "./spelling-doubling.js";
import { countDoubledLetters } from "./hard-letter.js";

const rule = "medialOnsetDoubling";

interface SelectedRootSpelling {
  context: WordGenerationContext;
  baseSpelling: BaseSpelling;
  root: readonly Syllable[];
  seed: number;
  projectAttachment?: (written: string) => { prefix: string; root: string; suffix: string };
}

function repeatLetter(word: string, index: number): string {
  return word.slice(0, index) + word[index] + word.slice(index);
}

function repeatHyphenatedLetter(hyphenated: string, written: string, index: number): string | undefined {
  if (hyphenated.replaceAll("&shy;", "") !== written) return undefined;
  const parts = hyphenated.split("&shy;");
  for (const [partIndex, part] of parts.entries()) {
    if (index < part.length) {
      parts[partIndex] = repeatLetter(part, index);
      return parts.join("&shy;");
    }
    index -= part.length;
  }
}

export function createMedialOnsetDoubler(config: LanguageConfig) {
  const doubling = config.doubling;
  const policy = doubling?.medialOnset;
  if (!doubling?.enabled || doubling.probability <= 0 || !policy || !doubling.realizations?.length) return;
  const singlePhoneDoubles = new Set(doubling.realizations
    .filter(({ phoneme, from, to, reading }) => phoneme === from && to === from.repeat(2) && reading.kind === "single-phone")
    .map(({ from }) => from));
  const consonants = new Set(policy.consonants.filter(letter =>
    singlePhoneDoubles.has(letter) && !doubling.neverDouble.includes(letter)));
  const nucleusSpellings = new Map(Object.entries(policy.nucleusSpellings));
  const doubledForms = [...new Set(doubling.realizations.map(realization => realization.to))];
  const finalOnly = new Set(doubling.finalDoublingOnly);
  const model = createDoublingModel(doubling);
  const targets = config.syllableStructure.letterLengthTargets;
  const budgets = config.writtenFormConstraints;

  function staysWithinBudgets(before: string, after: string): boolean {
    if (!budgets) return true;
    const measured = measureSpellingBudgets(after, budgets);
    if (!measured.exceeded.length) return true;
    const previous = measureSpellingBudgets(before, budgets);
    return measured.exceeded.every(key => measured.values[key] <= previous.values[key]);
  }

  return ({ context, baseSpelling, root, seed, projectAttachment }: SelectedRootSpelling): void => {
    if (root.length < 2) return;
    const probability = policy.probability[root.length === 2 ? "two" : root.length === 3 ? "three" : "longer"];
    if (probability <= 0) return;
    const { cells, units, phones } = baseSpelling.current();
    const { written, lexical, syllables } = context.word;
    const selectedDoubles = units.filter(unit =>
      model.isDirectForm(phones[unit.phoneIds[0]].soundAtSpelling, unit.afterDoubling)).length;
    // Hard-letter repairs can spend the quota after the initial selection.
    let count = Math.max(selectedDoubles, countDoubledLetters(written.clean, doubledForms));
    if (count >= doubling.maxPerWord) return;
    const rng = createSeededRng(seed);
    for (let index = 1; index + 1 < cells.length; index++) {
      const cell = cells[index];
      if (!consonants.has(cell.text) || cell.origin.kind !== "selection") continue;
      const unit = units[cell.origin.unitId];
      if (unit.selected !== cell.text || unit.afterDoubling !== cell.text) continue;
      const phone = phones[unit.phoneIds[0]];
      const left = root[phone.syllableIndex - 1];
      const right = root[phone.syllableIndex];
      if (phone.segment !== "onset" || phone.soundAtSpelling !== cell.text || !left?.stress ||
          left.coda.length || left.nucleus.length !== 1 || right.onset.length !== 1) continue;
      const sound = left.nucleus[0];
      if ((doubling.trigger === "lax-vowel" && sound.tense !== false) ||
          (doubling.suppressAfterReduction && sound.reduced) ||
          (doubling.suppressBeforeTense && right.nucleus[0]?.tense === true)) continue;
      const vowel = nucleusSpellings.get(sound.sound);
      if (!vowel || cells[index - 1].text !== vowel || doubling.neverDoubleAfter?.includes(vowel)) continue;
      const previous = baseSpelling.letterSource(index - 1);
      const next = baseSpelling.letterSource(index + 1);
      if (previous?.id !== phone.id - 1 || next?.id !== phone.id + 1 || next.segment !== "nucleus" ||
          baseSpelling.letterSource(index - 2)?.id === previous.id) continue;
      const finalRightIndex = (lexical?.rootSyllableStart ?? 0) + phone.syllableIndex;
      const finalLeft = syllables[finalRightIndex - 1];
      if (!finalLeft?.stress || finalLeft.nucleus[0]?.sound !== sound.sound) continue;
      if (doubling.suppressBeforeTense && syllables[finalRightIndex]?.nucleus[0]?.tense === true) continue;
      const blockedByFinal = phone.syllableIndex === root.length - 1 && finalOnly.size > 0 && !finalOnly.has(cell.text);
      const blockedByStress = !right.stress && doubling.unstressedModifier === 0;
      if (!blockedByFinal && !blockedByStress) continue;
      const before = written.clean;
      if (!isVowelChar(cells[index + 1].text, index + 1, before) ||
          scoreLetterLength(before.length, root.length, targets) !==
            scoreLetterLength(before.length + 1, root.length, targets)) continue;
      if (rng() * 100 >= probability) continue;
      const after = repeatLetter(before, index);
      const hyphenated = repeatHyphenatedLetter(written.hyphenated, before, index);
      if (hyphenated === undefined || !staysWithinBudgets(before, after)) continue;
      if (projectAttachment) {
        const oldParts = projectAttachment(before);
        const newParts = projectAttachment(after);
        if (oldParts.root.slice(0, index + 2) !== before.slice(0, index + 2) ||
            newParts.root !== repeatLetter(oldParts.root, index) ||
            oldParts.prefix !== newParts.prefix || oldParts.suffix !== newParts.suffix ||
            countDoubledLetters(newParts.root, doubledForms) > doubling.maxPerWord ||
            !staysWithinBudgets(oldParts.prefix + oldParts.root + oldParts.suffix,
              newParts.prefix + newParts.root + newParts.suffix)) continue;
      }

      const doubled = cell.text.repeat(2);
      baseSpelling.edit("word", index, 1, doubled, rule);
      written.clean = after;
      written.hyphenated = hyphenated;
      const trace = context.trace;
      if (trace) {
        const orthography = trace.orthographyTrace;
        if (orthography?.surface === before) {
          const chosen = orthography.chars[index];
          orthography.chars.splice(index, 0, { ...chosen });
          for (let i = index; i < orthography.chars.length; i++) orthography.chars[i].index = i;
          for (const spellingUnit of orthography.graphemeUnits) {
            if (spellingUnit.start !== null && spellingUnit.start > index) spellingUnit.start++;
            if (spellingUnit.end !== null && spellingUnit.end >= index) spellingUnit.end++;
          }
          orthography.surface = after;
        }
        trace.baseSpelling = baseSpelling.snapshot();
        trace.recordLetterRespelling(phone.id, { form: doubled, rule });
        trace.recordRepair(rule, before, after, `selection ${phone.id}`);
      }
      count++;
      if (count >= doubling.maxPerWord) return;
      index++;
    }
  };
}
