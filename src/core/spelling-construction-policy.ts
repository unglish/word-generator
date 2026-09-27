import type { SharedSpellingRule } from "../config/language.js";
import type { Phoneme } from "../types.js";
import type { RNG } from "../utils/random.js";

/** Phonological/context input only; the caller must authenticate complete live units. */
export interface SharedSpellingContext {
  phase: "syllable" | "word";
  offsetInScope: number;
  phonemes: readonly Phoneme[];
  followingPhoneme?: Phoneme;
  followingLetter: string;
}

export type SharedSpellingRefusal = "wrong-phase" | "sound-sequence" | "initial-position"
  | "following-phone" | "following-letter" | "zero-probability";

export type SharedSpellingSupport =
  | { status: "refused"; ruleId: string; reason: SharedSpellingRefusal }
  | { status: "eligible"; ruleId: string; form: string; sounds: string[]; probability: number };

export type SharedSpellingTrial =
  | Extract<SharedSpellingSupport, { status: "refused" }>
  | { status: "formed" | "roll-failed"; support: Extract<SharedSpellingSupport, { status: "eligible" }>; roll?: number };

function validRule(rule: SharedSpellingRule): boolean {
  if (!rule || typeof rule !== "object" || typeof rule.id !== "string" || !rule.id ||
      typeof rule.form !== "string" || !rule.form || !Number.isFinite(rule.probability) ||
      rule.probability < 0 || rule.probability > 100 || !["syllable", "word", "both"].includes(rule.scope) ||
      !Array.isArray(rule.phonemes) || rule.phonemes.length < 2 ||
      !rule.phonemes.every(phone => phone && typeof phone.sound === "string" && phone.sound.length > 0) ||
      !rule.context || typeof rule.context !== "object" || Array.isArray(rule.context)) return false;
  if (rule.context.nonInitial !== undefined && typeof rule.context.nonInitial !== "boolean") return false;
  const following = rule.context.following;
  if (following === undefined) return true;
  return !!following && following.phoneClass === "vowel" &&
    Array.isArray(following.letters) && following.letters.length > 0 &&
    following.letters.every(letter => typeof letter === "string" && letter.length === 1);
}

function copyRule(rule: SharedSpellingRule): SharedSpellingRule {
  return { ...rule, phonemes: rule.phonemes.map(phone => ({ ...phone })),
    context: { ...rule.context, ...(rule.context.following ? {
      following: { ...rule.context.following, letters: [...rule.context.following.letters] },
    } : {}) } };
}

function isVowel(phoneme: Phoneme | undefined): boolean {
  return phoneme !== undefined && ["highVowel", "midVowel", "lowVowel"].includes(phoneme.mannerOfArticulation);
}

/** Pure policy support and its exact local sampling law, not an ownership certificate. */
export function createSharedSpellingPolicy(rules: readonly SharedSpellingRule[]) {
  if (!Array.isArray(rules)) throw new Error("Shared spelling rules must be an array");
  const compiled = new Map<string, SharedSpellingRule>();
  for (const rule of rules) {
    if (!validRule(rule) || compiled.has(rule.id)) throw new Error("Invalid or duplicate shared spelling rule");
    compiled.set(rule.id, copyRule(rule));
  }

  function describe(ruleId: string, input: SharedSpellingContext): SharedSpellingSupport {
    const rule = compiled.get(ruleId);
    if (!rule) throw new Error(`Unknown shared spelling rule: ${ruleId}`);
    if (!Number.isSafeInteger(input.offsetInScope) || input.offsetInScope < 0 ||
        !["syllable", "word"].includes(input.phase)) throw new Error("Invalid shared spelling scope");
    const refuse = (reason: SharedSpellingRefusal): SharedSpellingSupport => ({ status: "refused", ruleId, reason });
    if (rule.scope !== "both" && rule.scope !== input.phase) return refuse("wrong-phase");
    if (input.phonemes.length !== rule.phonemes.length ||
        input.phonemes.some((phone, index) => phone.sound !== rule.phonemes[index].sound)) return refuse("sound-sequence");
    if (rule.context.nonInitial && input.offsetInScope === 0) return refuse("initial-position");
    if (rule.context.following) {
      if (!isVowel(input.followingPhoneme)) return refuse("following-phone");
      if (!rule.context.following.letters.includes(input.followingLetter)) return refuse("following-letter");
    }
    if (rule.probability === 0) return refuse("zero-probability");
    return { status: "eligible", ruleId, form: rule.form,
      sounds: rule.phonemes.map(phone => phone.sound), probability: rule.probability };
  }

  function sample(ruleId: string, input: SharedSpellingContext, rand: RNG): SharedSpellingTrial {
    const support = describe(ruleId, input);
    if (support.status === "refused") return support;
    if (support.probability === 100) return { status: "formed", support };
    const roll = rand();
    if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error("Invalid shared spelling RNG value");
    return { status: roll < support.probability / 100 ? "formed" : "roll-failed", support, roll };
  }

  return { ruleIds: Object.freeze([...compiled.keys()]), describe, sample };
}
