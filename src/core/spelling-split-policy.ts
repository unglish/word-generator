import type { RNG } from "../utils/random.js";

export interface SplitVowelSupport {
  vowel: { sound: string; component: string };
  coda: { sounds: string[]; written: string };
  marker: string;
}

export interface SplitVowelContext {
  vowel: { sound: string; form: string; position: "onset" | "nucleus" | "coda" };
  coda: { sounds: readonly string[]; written: string };
  route: "syllable" | "word";
  finalRootSyllable: boolean;
  syllableCount: number;
}

export interface SplitVowelRoutes {
  syllable: { forms: string[]; probability: number };
  word: { swaps: { phoneme: string; from: string; to: string }[]; probability: number; monosyllableMultiplier: number };
}

export type SplitVowelDecision =
  | { status: "refused"; reason: "not-nucleus" | "unsupported-vowel" | "unsupported-coda" | "outside-word-edge" | "unsupported-input" }
  | { status: "eligible"; support: SplitVowelSupport; probability: number };

export type SplitVowelTrial = Exclude<SplitVowelDecision, { status: "eligible" }>
  | { status: "formed" | "not-formed"; support: SplitVowelSupport; probability: number; roll?: number };

function probability(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error("Invalid split-vowel probability");
}

function sameSounds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((sound, index) => sound === b[index]);
}

/** Reading policy only; callers must authenticate complete live ownership and neighbors before sampling. */
export function createSplitVowelPolicy(supports: readonly SplitVowelSupport[], routes: SplitVowelRoutes) {
  const table = structuredClone(supports);
  const policy = structuredClone(routes);
  probability(policy.syllable.probability);
  probability(policy.word.probability);
  if (!Number.isFinite(policy.word.monosyllableMultiplier) || policy.word.monosyllableMultiplier < 0) {
    throw new Error("Invalid split-vowel monosyllable multiplier");
  }
  const keys = new Set<string>();
  const components = new Map<string, string>();
  for (const row of table) {
    if (!row.vowel.sound || !row.vowel.component || !row.marker || !row.coda.written ||
        !row.coda.sounds.length || row.coda.sounds.some(sound => !sound)) throw new Error("Incomplete split-vowel support");
    const key = JSON.stringify([row.vowel.sound, row.coda.sounds, row.coda.written]);
    if (keys.has(key)) throw new Error("Duplicate split-vowel support");
    keys.add(key);
    const component = components.get(row.vowel.sound);
    if (component !== undefined && component !== row.vowel.component) throw new Error("Ambiguous split-vowel component");
    components.set(row.vowel.sound, row.vowel.component);
  }

  function describe(context: SplitVowelContext): SplitVowelDecision {
    if (!Number.isSafeInteger(context.syllableCount) || context.syllableCount < 1) throw new Error("Invalid split-vowel syllable count");
    if (context.vowel.position !== "nucleus") return { status: "refused", reason: "not-nucleus" };
    const component = components.get(context.vowel.sound);
    if (component === undefined) return { status: "refused", reason: "unsupported-vowel" };
    const support = table.find(row => row.vowel.sound === context.vowel.sound &&
      row.coda.written === context.coda.written && sameSounds(row.coda.sounds, context.coda.sounds));
    if (!support) return { status: "refused", reason: "unsupported-coda" };
    let chance: number;
    if (context.route === "syllable") {
      if (!policy.syllable.forms.includes(context.vowel.form)) return { status: "refused", reason: "unsupported-input" };
      chance = policy.syllable.probability;
    } else {
      if (!context.finalRootSyllable) return { status: "refused", reason: "outside-word-edge" };
      if (!policy.word.swaps.some(swap => swap.phoneme === context.vowel.sound &&
          swap.from === context.vowel.form && swap.to === component)) return { status: "refused", reason: "unsupported-input" };
      chance = Math.min(100, policy.word.probability * (context.syllableCount === 1 ? policy.word.monosyllableMultiplier : 1));
    }
    return { status: "eligible", support: structuredClone(support), probability: chance };
  }

  function sample(context: SplitVowelContext, rand: RNG): SplitVowelTrial {
    const decision = describe(context);
    if (decision.status === "refused") return decision;
    const { support, probability: chance } = decision;
    if (chance === 0 || chance === 100) return { status: chance === 100 ? "formed" : "not-formed", support, probability: chance };
    const roll = rand();
    if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error("Invalid split-vowel random draw");
    return { status: roll < chance / 100 ? "formed" : "not-formed", support, probability: chance, roll };
  }

  return { describe, sample };
}
