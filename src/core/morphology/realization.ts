import type { StructuralTrace } from "../trace.js";
import type { FinalPhoneTrace } from "../final-phones.js";
import type { FinalSpelling, FinalSpellingTrace } from "../final-spelling.js";
import type { RegexSpellingEdit } from "../spelling-regex-edits.js";
import type { AffixSyllable } from "../../config/language.js";
import type { Phoneme, Word } from "../../types.js";

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
  spelling?: FinalSpelling;
  prefix?: ResolvedAffix;
  suffix?: ResolvedAffix;
  parts: MorphologyWrittenPart[];
}

export interface MorphologyRootEdit {
  phase: "morphophonemic" | "boundary";
  boundary: "prefix-root" | "root-suffix";
  rule: string;
  ruleIndex: number;
  before: string;
  after: string;
  edits: RegexSpellingEdit[];
}

export interface MorphologyRealizationTrace {
  /** Root state at allomorph selection, before boundary alternations and attachment. */
  selectionPhones?: FinalPhoneTrace;
  /** Exact configured affix positions; -1 denotes an unregistered internal caller. */
  configurationIndices?: { prefix?: number; suffix?: number };
  /** Phone identities at assembly, before the subsequent pronunciation pass. */
  phoneAssembly?: FinalPhoneTrace;
  finalPhones?: FinalPhoneTrace;
  finalSpelling?: FinalSpellingTrace;
  /** Executed root regex replacements; operational lineage, not reading licenses. */
  rootEdits?: MorphologyRootEdit[];
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


export interface MorphologyRegexState {
  part: "prefix" | "suffix";
  phase: "morphophonemic" | "boundary";
  index: number;
  lastIndex: number;
}
export interface MorphologyPassTrace {
  structural: StructuralTrace[];
  version: 1;
  before: Word;
  after: Word;
  rolls: number[];
  regexBefore: MorphologyRegexState[];
  regexAfter: MorphologyRegexState[];
  realization?: MorphologyRealizationTrace;
}

/** Executed lexical attachment, before final nucleus repair and spelling. */
export interface MorphologyPreparationTrace extends MorphologyPassTrace {
  template: string;
  configurationIndices: { prefix?: number; suffix?: number };
  phonesBefore?: FinalPhoneTrace;
  phonesAfter?: FinalPhoneTrace;
  prepared?: {
    prefix?: ResolvedAffix;
    suffix?: ResolvedAffix;
    rootSyllableStart: number;
    rules: { ruleIndex: number; boundary: "prefix-root" | "root-suffix"; rule: string }[];
  };
}

/** Executed written attachment; no phonemic preparation is repeated. */
export interface MorphologyWritingTrace extends MorphologyPassTrace {
  spellingBefore?: FinalSpellingTrace;
  spellingAfter?: FinalSpellingTrace;
}
