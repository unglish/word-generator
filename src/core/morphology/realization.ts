import type { AffixSyllable } from "../../config/language.js";
import type { Phoneme } from "../../types.js";

export interface AffixForm {
  written: string;
  phonemes: string[];
  syllables?: AffixSyllable[];
  syllableCount: number;
}

export type AllomorphBoundaryPhoneme = Pick<Phoneme, "sound" | "voiced" | "mannerOfArticulation" | "placeOfArticulation">;

export interface ResolvedAffix {
  planned: AffixForm;
  resolved: AffixForm;
  /** Index in the original configured allomorph array; null selects the base. */
  allomorphIndex: number | null;
  /** Snapshot of the root phone tested before any root alternations. */
  boundaryPhoneme?: AllomorphBoundaryPhoneme;
}

export interface MorphologyWrittenPart {
  role: "prefix" | "root" | "suffix";
  text: string;
}

export interface MorphologyResult {
  prefix?: ResolvedAffix;
  suffix?: ResolvedAffix;
  parts: MorphologyWrittenPart[];
}

export interface MorphologyRealizationTrace {
  prefix?: ResolvedAffix;
  suffix?: ResolvedAffix;
  assembledParts: MorphologyWrittenPart[];
  emittedParts: MorphologyWrittenPart[];
}

export function snapshotAffixForm(form: AffixForm): AffixForm {
  return {
    written: form.written,
    phonemes: [...form.phonemes],
    syllableCount: form.syllableCount,
    syllables: form.syllables?.map(syllable => ({
      onset: [...syllable.onset], nucleus: [...syllable.nucleus], coda: [...syllable.coda],
    })),
  };
}

export function snapshotWrittenParts(parts: MorphologyWrittenPart[]): MorphologyWrittenPart[] {
  return parts.map(part => ({ ...part }));
}
