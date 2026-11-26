/**
 * The order in which one root attempt's stages run (#556), by kind of word.
 * The golden fixture's first-attempt counts and the stage stream wiring tests
 * rely on it, and `stage-stream-wiring.test.ts` checks it against every
 * attempt's recorded draws.
 *
 * A bare word renders its pronunciation inside each attempt, before scoring,
 * and its gap spelling draws from `spell` again after that. An affixed word
 * renders it after selection. The finishing stages run once, for the selected
 * attempt, after every attempt has run.
 *
 * Not part of the published build (excluded in tsconfig.json).
 */
import type { AttemptStage } from "../core/stage-streams.js";
import type { Word } from "../types.js";

export type WordKind = "bare" | "affixed";

/** Each attempt stage's runs in order. A stage listed twice resumes its stream. */
const AFTER_SELECTION: Readonly<Record<WordKind, readonly AttemptStage[]>> = {
  bare: [
    "assign_stress", "post_stress_repair",
    "spell", "render_pronunciation", "spell", "finalize_root_spelling",
  ],
  affixed: [
    "assign_stress", "post_stress_repair",
    "preview_morphology", "spell", "finalize_root_spelling", "render_pronunciation",
  ],
};

/** A boundary can draw only after both adjacent syllables have been selected. */
function attemptRunOrder(kind: WordKind, syllables: number): AttemptStage[] {
  const order: AttemptStage[] = ["plan_shape", "select_segments"];
  for (let i = 1; i < syllables; i++) order.push("select_segments", "adjust_boundary");
  if (syllables > 1) order.push("repair_vowel_hiatus");
  return [...order, ...AFTER_SELECTION[kind]];
}

/** Stages that run only for the selected attempt, after every attempt has run. */
export const FINISHING_STAGES: Readonly<Record<WordKind, ReadonlySet<AttemptStage>>> = {
  bare: new Set(["finalize_root_spelling"]),
  affixed: new Set(["finalize_root_spelling", "render_pronunciation"]),
};

/** A traced word's kind: bare when its affix plan is bare or morphology is off. */
export function wordKind(word: Word): WordKind {
  return (word.trace!.morphology?.template ?? "bare") === "bare" ? "bare" : "affixed";
}

/** Stages whose every run comes before `stage` first runs, so a change to `stage` cannot move their draws. */
export function stagesBefore(kind: WordKind, syllables: number, stage: AttemptStage): AttemptStage[] {
  const order = attemptRunOrder(kind, syllables);
  const first = order.indexOf(stage);
  return [...new Set(order)].filter(before => before !== stage && order.lastIndexOf(before) < first);
}

/**
 * Whether `runs`, one attempt's stages in the order they drew, follows `kind`'s
 * run order. A stage that does not draw leaves no run, so listed stages can be
 * missing. A stage's later listing resumes it, so it matches only after the
 * stage has run.
 */
export function followsRunOrder(kind: WordKind, syllables: number, runs: readonly AttemptStage[]): boolean {
  const order = attemptRunOrder(kind, syllables);
  const ran = new Set<AttemptStage>();
  let at = 0;
  for (const stage of runs) {
    const matches = (index: number) => order[index] === stage && (ran.has(stage) || order.indexOf(stage) === index);
    while (at < order.length && !matches(at)) at++;
    if (at === order.length) return false;
    ran.add(stage);
    at++;
  }
  return ran.has("select_segments");
}
