import type { HardLetterRespelling } from "../config/language.js";
import type { SpellingPhone } from "./base-spelling.js";
import { VOWEL_LETTERS } from "../utils/letters.js";

/** Why a hard letter was respelled. */
export type HardLetterReason = "soft-letter" | "root-final" | "not-after-short-vowel";

/** One planned respelling of a hard letter in the root's written form. */
export interface HardLetterRespell {
  /** Offset of the letter in the root's written form. */
  index: number;
  /** Letters replaced at `index`. */
  before: string;
  after: string;
  /** Grapheme decision (phone id) whose spelling is respelled. */
  phoneId: number;
  rule: string;
  reason: HardLetterReason;
  /** The letter that follows, possibly a suffix's first letter; empty at the end of the word. */
  next: string;
}

/** The phone that supplied the letter at an offset of the written root, if one can be named. */
export type LetterSource = (index: number) => SpellingPhone | undefined;

/** A written root and what the planner needs to know about it. */
export interface HardLetterInput {
  written: string;
  /**
   * Letters of `written` still before `following` once the suffix is attached;
   * the rest are dropped (the silent e of `edice` before -al). Default: all.
   */
  kept?: number;
  /** Written text that will follow the root (a planned suffix), or empty. */
  following: string;
  sourceAt: LetterSource;
  /** Doubled consonants a root may hold (`doubling.maxPerWord`); those already written count. */
  maxDoublings: number;
  /** Phones an affix rule re-sounds (`-ity` makes /k/ /s/); their letters are left alone. */
  resounded?: ReadonlySet<number>;
}

/** A compiled {@link HardLetterRespelling}. */
interface HardLetterRule {
  name: string;
  phoneme: string;
  letter: string;
  softBefore: Set<string>;
  afterShortVowel: string;
  /** Whether `afterShortVowel` is a doubled spelling (ck), which uses up a doubling. */
  doubles: boolean;
  otherwise: string;
  shortVowels: Set<string>;
  onlyAfterShortVowel: boolean;
  rootFinal?: {
    /** Root letters after `letter` that leave it final, including none. */
    tails: Set<string>;
    keepAfter: Set<string>;
    keepBefore: Set<string>;
  };
}

/** Plans respellings of a written root; returns them in left-to-right order. */
export type HardLetterPlanner = (input: HardLetterInput) => HardLetterRespell[];

/** Whether a spelling of a phoneme reads as a doubled consonant (ck for /k/). */
export type IsDoubledForm = (phoneme: string, form: string) => boolean;

/**
 * Doubled consonants written in a root: a repeated consonant letter (ll, ss)
 * or one of `doubledForms` (the rules' doubled replacements, such as ck),
 * counted left to right without overlap.
 */
export function countDoubledLetters(written: string, doubledForms: readonly string[]): number {
  let count = 0;
  for (let i = 0; i < written.length;) {
    const letter = written[i];
    if (letter === written[i + 1] && !VOWEL_LETTERS.has(letter)) {
      count++;
      i += 2;
      continue;
    }
    const form = doubledForms.find((f) => written.startsWith(f, i));
    if (form) {
      count++;
      i += form.length;
    } else i++;
  }
  return count;
}

/** Whether the letter at `index` is a vowel letter spelling a nucleus. */
function isNucleusVowel(written: string, index: number, sourceAt: LetterSource): boolean {
  return VOWEL_LETTERS.has(written[index]) && sourceAt(index)?.segment === "nucleus";
}

/**
 * Whether the letter before `index` is a single vowel letter spelling a short
 * vowel: `a` in jacket or maniac, but not `ea` in speak, `ur` in turkey, or
 * `i` in bike.
 */
function followsShortVowelLetter(
  rule: HardLetterRule,
  written: string,
  index: number,
  sourceAt: LetterSource,
): boolean {
  if (index < 1 || !isNucleusVowel(written, index - 1, sourceAt)) return false;
  const vowel = sourceAt(index - 1)!;
  // Only the same vowel's letter makes a digraph (ea); a vowel of the previous
  // syllable does not (maniac, heroic).
  if (index >= 2 && isNucleusVowel(written, index - 2, sourceAt) && sourceAt(index - 2)!.id === vowel.id)
    return false;
  return rule.shortVowels.has(vowel.soundAtSpelling);
}

function compile(rule: HardLetterRespelling, isDoubledForm: IsDoubledForm): HardLetterRule {
  return {
    ...rule,
    softBefore: new Set(rule.softBefore),
    doubles: isDoubledForm(rule.phoneme, rule.afterShortVowel),
    shortVowels: new Set(rule.shortVowels),
    onlyAfterShortVowel: rule.onlyAfterShortVowel ?? false,
    rootFinal: rule.rootFinal && {
      tails: new Set(["", ...rule.rootFinal.tails]),
      keepAfter: new Set(rule.rootFinal.keepAfter),
      keepBefore: new Set(rule.rootFinal.keepBefore),
    },
  };
}

/** Whether `afterShortVowel` (ck) at `index` is one unit of the phone that supplied its first letter. */
function isAfterShortVowelUnit(
  rule: HardLetterRule,
  written: string,
  index: number,
  sourceAt: LetterSource,
): boolean {
  if (!written.startsWith(rule.afterShortVowel, index)) return false;
  const id = sourceAt(index)?.id;
  for (let i = 1; i < rule.afterShortVowel.length; i++) {
    if (sourceAt(index + i)?.id !== id) return false;
  }
  return true;
}

/**
 * Whether a `letter` that does not read soft still needs respelling at the end
 * of the root: it is followed only by a final tail (desks), is not the kept
 * -ic/-ac, and no kept suffix letter follows it (action).
 */
function needsRootFinalRespell(
  rule: HardLetterRule,
  written: string,
  following: string,
  index: number,
  sourceAt: LetterSource,
): boolean {
  const final = rule.rootFinal;
  if (!final) return false;
  const rest = written.slice(index + 1);
  if (!final.tails.has(rest)) return false;
  if (rest === "" && final.keepBefore.has(following[0] ?? "")) return false;
  return !(final.keepAfter.has(written[index - 1]) &&
    followsShortVowelLetter(rule, written, index, sourceAt));
}

/**
 * Builds a planner for the configured hard letters. A letter is respelled when
 * it spells the rule's phoneme and the next letter, or a planned suffix's first
 * letter, would read it soft (`farcew` → `farkew`, `panic` + `ing` → `panicking`),
 * or, with `rootFinal`, when it ends the root outside -ic/-ac (`molstisc` →
 * `molstisk`). With `onlyAfterShortVowel`, a `ck` after anything but a short
 * single vowel letter becomes `k` (`yarck` → `yark`).
 */
export function createHardLetterPlanner(
  rules: HardLetterRespelling[],
  isDoubledForm: IsDoubledForm,
): HardLetterPlanner {
  const compiled = rules.map((rule) => compile(rule, isDoubledForm));
  const doubledForms = [...new Set(compiled.filter((rule) => rule.doubles).map((rule) => rule.afterShortVowel))];
  return ({ written: root, kept = root.length, following, sourceAt, maxDoublings, resounded }) => {
    let doublingsLeft = maxDoublings - countDoubledLetters(root, doubledForms);
    // Checks of what follows a letter see the root as attached; letters before
    // it (vowel context) are unchanged.
    const written = root.slice(0, kept);
    const respells: HardLetterRespell[] = [];
    /** `afterShortVowel` where it is due and a doubled spelling still fits the limit. */
    const replacement = (rule: HardLetterRule, index: number): string => {
      if (!followsShortVowelLetter(rule, written, index, sourceAt)) return rule.otherwise;
      if (!rule.doubles) return rule.afterShortVowel;
      if (doublingsLeft <= 0) return rule.otherwise;
      doublingsLeft--;
      return rule.afterShortVowel;
    };
    for (const rule of compiled) {
      for (let index = 0; index < written.length; index++) {
        if (written[index] !== rule.letter) continue;
        const source = sourceAt(index);
        if (source?.soundAtSpelling !== rule.phoneme || resounded?.has(source.id)) continue;
        const respell = (before: string, after: string, reason: HardLetterReason): void => {
          const next = written[index + before.length] ?? following[0] ?? "";
          respells.push({ index, before, after, phoneId: source.id, rule: rule.name, reason, next });
        };
        if (isAfterShortVowelUnit(rule, written, index, sourceAt)) {
          if (rule.onlyAfterShortVowel && !followsShortVowelLetter(rule, written, index, sourceAt))
            respell(rule.afterShortVowel, rule.otherwise, "not-after-short-vowel");
          index += rule.afterShortVowel.length - 1;
          continue;
        }
        const next = written[index + 1] ?? following[0] ?? "";
        if (rule.softBefore.has(next)) respell(rule.letter, replacement(rule, index), "soft-letter");
        else if (needsRootFinalRespell(rule, written, following, index, sourceAt))
          respell(rule.letter, replacement(rule, index), "root-final");
      }
    }
    return respells.sort((a, b) => a.index - b.index);
  };
}
