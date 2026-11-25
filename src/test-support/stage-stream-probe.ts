/**
 * A test probe on the per-stage random streams (#556). It can count each stage
 * stream's draws, or shift one stage's draws to show which outputs read it.
 *
 * Since each stage has its own stream, a change that adds a draw at the end of
 * a stage's stream leaves every word the same. Comparing words therefore cannot
 * show that a change draws nothing; comparing the draws {@link withStageDraws}
 * counts can.
 *
 * The probe uses the internal draw hook in `src/core/stage-streams.ts`, so it
 * needs no module mock. Outside these functions every draw passes through.
 *
 * Not part of the published build (excluded in tsconfig.json).
 */
import { withStageDrawHook, type AttemptStage, type WordStage } from "../core/stage-streams.js";

export type Stage = WordStage | AttemptStage;

/** Draws per stream: `stage` for a word stage, `stage#n` for attempt `n` (0-based). */
export type StageDraws = Record<string, number>;

/** Run `run`, counting the draws of every stage stream it reads. */
export function withStageDraws<T>(run: () => T): { value: T; draws: StageDraws } {
  const draws: StageDraws = {};
  const value = withStageDrawHook((stage, attempt, r) => {
    const label = attempt === undefined ? stage : `${stage}#${attempt}`;
    draws[label] = (draws[label] ?? 0) + 1;
    return r;
  }, run);
  return { value, draws };
}

/** Total draws of `stage` over every attempt. */
export function stageTotal(draws: StageDraws, stage: Stage): number {
  return Object.entries(draws)
    .filter(([label]) => label.split("#")[0] === stage)
    .reduce((sum, [, count]) => sum + count, 0);
}

/**
 * Run `run` with `stage`'s draws moved by half the unit interval, `(r + 0.5) % 1`.
 * `attempts` limits an attempt stage's shift to some root attempts.
 */
export function withShiftedStage<T>(stage: Stage, run: () => T, attempts: (attempt: number) => boolean = () => true): T {
  return withStageDrawHook((drawn, attempt, r) =>
    drawn === stage && (attempt === undefined || attempts(attempt)) ? (r + 0.5) % 1 : r, run);
}
