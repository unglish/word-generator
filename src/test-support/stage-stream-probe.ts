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
import { WORD_STAGES, withStageDrawHook, type AttemptStage, type WordStage } from "../core/stage-streams.js";

export type Stage = WordStage | AttemptStage;

/** Draws per stream: each word stage's, and each attempt stage's by root attempt (0-based). */
export interface StageDraws {
  word: Partial<Record<WordStage, number>>;
  attempts: Array<Partial<Record<AttemptStage, number>>>;
}

const WORD_STAGE_SET: ReadonlySet<Stage> = new Set(WORD_STAGES);

function isWordStage(stage: Stage): stage is WordStage {
  return WORD_STAGE_SET.has(stage);
}

/** Run `run`, counting the draws of every stage stream it reads. */
export function withStageDraws<T>(run: () => T): { value: T; draws: StageDraws } {
  const draws: StageDraws = { word: {}, attempts: [] };
  const value = withStageDrawHook((stage, attempt, r) => {
    if (attempt === undefined) {
      const wordStage = stage as WordStage;
      draws.word[wordStage] = (draws.word[wordStage] ?? 0) + 1;
    } else {
      while (draws.attempts.length <= attempt) draws.attempts.push({});
      const counts = draws.attempts[attempt];
      const attemptStage = stage as AttemptStage;
      counts[attemptStage] = (counts[attemptStage] ?? 0) + 1;
    }
    return r;
  }, run);
  return { value, draws };
}

/** Draws of `stage`: a word stage's, or an attempt stage's on `attempt`, or over every attempt when it is omitted. */
export function stageCount(draws: StageDraws, stage: Stage, attempt?: number): number {
  if (isWordStage(stage)) return draws.word[stage] ?? 0;
  const attempts = attempt === undefined ? draws.attempts : draws.attempts.slice(attempt, attempt + 1);
  return attempts.reduce((sum, counts) => sum + (counts[stage] ?? 0), 0);
}

/** The same draws with `stage`'s left out. */
export function withoutStage(draws: StageDraws, stage: Stage): StageDraws {
  const without = <K extends Stage>(counts: Partial<Record<K, number>>) =>
    Object.fromEntries(Object.entries(counts).filter(([drawn]) => drawn !== stage)) as Partial<Record<K, number>>;
  return { word: without(draws.word), attempts: draws.attempts.map(without) };
}

/**
 * Run `run` with `stage`'s draws moved by half the unit interval, `(r + 0.5) % 1`.
 * `attempts` limits an attempt stage's shift to some root attempts.
 */
export function withShiftedStage<T>(stage: Stage, run: () => T, attempts: (attempt: number) => boolean = () => true): T {
  return withStageDrawHook((drawn, attempt, r) =>
    drawn === stage && (attempt === undefined || attempts(attempt)) ? (r + 0.5) % 1 : r, run);
}
