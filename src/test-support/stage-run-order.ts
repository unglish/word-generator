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
export const ATTEMPT_RUN_ORDER: Readonly<Record<WordKind, readonly AttemptStage[]>> = {
  bare: [
    "plan_shape", "select_segments", "assign_stress", "post_stress_repair",
    "spell", "render_pronunciation", "spell", "finalize_root_spelling",
  ],
  affixed: [
    "plan_shape", "select_segments", "assign_stress", "post_stress_repair",
    "preview_morphology", "spell", "finalize_root_spelling", "render_pronunciation",
  ],
};

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
export function stagesBefore(kind: WordKind, stage: AttemptStage): AttemptStage[] {
  const order = ATTEMPT_RUN_ORDER[kind];
  const first = order.indexOf(stage);
  return [...new Set(order)].filter(before => before !== stage && order.lastIndexOf(before) < first);
}

/** Whether `runs`, one attempt's stages in the order they drew, follows `kind`'s run order. */
export function followsRunOrder(kind: WordKind, runs: readonly AttemptStage[]): boolean {
  const order = ATTEMPT_RUN_ORDER[kind];
  let at = 0;
  for (const stage of runs) {
    while (at < order.length && order[at] !== stage) at++;
    if (at === order.length) return false;
    at++;
  }
  return true;
}
