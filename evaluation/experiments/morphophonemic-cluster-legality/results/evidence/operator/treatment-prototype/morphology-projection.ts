import type { Phoneme, Syllable } from "../types.js";
import type { FinalPhoneSource, PhonePart, PhoneSegment } from "./final-phones.js";
import type { AffixForm } from "./morphology/realization.js";

export type MorphologyPhonePosition = PhoneSegment;
export type MorphologyPhoneSource = Exclude<FinalPhoneSource, { kind: "bridge" }>;
export interface ProposedMorphologyPhone { phoneme: Phoneme; source: MorphologyPhoneSource }
export type ProposedMorphologySyllable = Record<MorphologyPhonePosition, ProposedMorphologyPhone[]>;
export interface MorphophonemicTarget { syllableIndex: number; segment: MorphologyPhonePosition; index: number }

const POSITIONS: readonly MorphologyPhonePosition[] = ["onset", "nucleus", "coda"];

function sourceSyllables(syllables: readonly Syllable[], part: PhonePart): ProposedMorphologySyllable[] {
  return syllables.map((syllable, syllableIndex) => Object.fromEntries(POSITIONS.map(segment =>
    [segment, syllable[segment].map((phoneme, index) => ({ phoneme,
      source: { kind: "segment" as const, part, syllable: syllableIndex, segment, index } }))])) as ProposedMorphologySyllable);
}

function affixProjection(form: AffixForm | undefined, part: "prefix" | "suffix", resolve: (sound: string) => Phoneme) {
  const syllables = form?.syllables?.map(template => ({
    onset: template.onset.map(resolve), nucleus: template.nucleus.map(resolve), coda: template.coda.map(resolve),
  })) ?? [];
  const sourced = sourceSyllables(syllables, part);
  const flat = sourced.length ? [] : (form?.phonemes ?? []).map((sound, index) => ({ phoneme: resolve(sound),
    source: { kind: "flat-affix" as const, part, index } }));
  return { syllables: sourced, flat };
}

/** Pure assembly before random hiatus bridges; matches the current zero-syllable insertion order. */
export function projectMorphologyReplacement(root: readonly Syllable[], target: MorphophonemicTarget,
  replacement: Phoneme, prefix: AffixForm | undefined, suffix: AffixForm | undefined,
  resolve: (sound: string) => Phoneme) {
  const roots = sourceSyllables(root, "root");
  const selected = roots[target.syllableIndex]?.[target.segment]?.[target.index];
  if (!selected) throw new Error("Morphophonemic target is outside the lexical root.");
  selected.phoneme = replacement;
  const prefixProjection = affixProjection(prefix, "prefix", resolve);
  const suffixProjection = affixProjection(suffix, "suffix", resolve);
  if (suffix?.syllableCount === 0) {
    if (suffixProjection.syllables.length) {
      for (const syllable of suffixProjection.syllables) roots.at(-1)!.coda.push(...syllable.onset, ...syllable.nucleus, ...syllable.coda);
      suffixProjection.syllables.length = 0;
    } else roots.at(-1)!.coda.push(...suffixProjection.flat);
  }
  if (prefix?.syllableCount === 0) {
    if (prefixProjection.syllables.length) {
      for (const syllable of prefixProjection.syllables) roots[0].onset.unshift(...syllable.onset, ...syllable.nucleus, ...syllable.coda);
      prefixProjection.syllables.length = 0;
    } else {
      // Existing attachment unshifts each phone separately, reversing this flat list.
      for (const phone of prefixProjection.flat) roots[0].onset.unshift(phone);
    }
  }
  const syllables = [...prefixProjection.syllables, ...roots, ...suffixProjection.syllables];
  return { syllables, rootSyllableStart: prefixProjection.syllables.length,
    target: { ...target, syllableIndex: prefixProjection.syllables.length + target.syllableIndex,
      index: syllables[prefixProjection.syllables.length + target.syllableIndex][target.segment].indexOf(selected) },
    rootTarget: { ...target }, selected };
}
