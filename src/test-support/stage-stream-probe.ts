/**
 * A test probe on the per-stage random streams (#556). It can count each stage
 * stream's draws, record the order in which stages draw, or shift one stage's
 * draws to show which outputs read it.
 *
 * Since each stage has its own stream, a change that adds a draw at the end of
 * a stage's stream leaves every word the same. Comparing words therefore cannot
 * show that a change draws nothing; comparing the draws {@link withStageDraws}
 * counts can. `expectSameWordsAndDraws` in `./expect-same-draws.ts` does both.
 *
 * The probe uses the internal draw hook in `src/core/stage-streams.ts`, so it
 * needs no module mock. Outside these functions every draw passes through.
 *
 * Not part of the published build (excluded in tsconfig.json).
 */
import { WORD_STAGES, withStageDrawHook, type AttemptStage, type Stage, type WordStage } from "../core/stage-streams.js";

/** Draws per stream: each word stage's, and each attempt stage's by root attempt (0-based). */
export interface StageDraws {
  word: Partial<Record<WordStage, number>>;
  attempts: Array<Partial<Record<AttemptStage, number>>>;
}

/** Run `run`, counting the draws of every stage stream it reads. */
export function withStageDraws<T>(run: () => T): { value: T; draws: StageDraws } {
  const draws: StageDraws = { word: {}, attempts: [] };
  const value = withStageDrawHook((stream, r) => {
    if (stream.attempt === undefined) {
      draws.word[stream.stage] = (draws.word[stream.stage] ?? 0) + 1;
    } else {
      while (draws.attempts.length <= stream.attempt) draws.attempts.push({});
      const counts = draws.attempts[stream.attempt];
      counts[stream.stage] = (counts[stream.stage] ?? 0) + 1;
    }
    return r;
  }, run);
  return { value, draws };
}

/** Run `run`, recording each root attempt's stages in the order they draw, one entry per unbroken run of draws. */
export function withStageRuns<T>(run: () => T): { value: T; runs: AttemptStage[][] } {
  const runs: AttemptStage[][] = [];
  const value = withStageDrawHook((stream, r) => {
    if (stream.attempt !== undefined) {
      while (runs.length <= stream.attempt) runs.push([]);
      const attempt = runs[stream.attempt];
      if (attempt.at(-1) !== stream.stage) attempt.push(stream.stage);
    }
    return r;
  }, run);
  return { value, runs };
}

/** Draws of `stage`: a word stage's, or an attempt stage's over every attempt. */
export function stageCount(draws: StageDraws, stage: Stage): number {
  if (isWordStage(stage)) return draws.word[stage] ?? 0;
  return draws.attempts.reduce((sum, counts) => sum + (counts[stage] ?? 0), 0);
}

function isWordStage(stage: Stage): stage is WordStage {
  return (WORD_STAGES as readonly Stage[]).includes(stage);
}

/** Draws of an attempt stage on root attempt `attempt` (0-based). */
export function attemptStageCount(draws: StageDraws, stage: AttemptStage, attempt: number): number {
  return draws.attempts[attempt]?.[stage] ?? 0;
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
  return withStageDrawHook((stream, r) =>
    stream.stage === stage && (stream.attempt === undefined || attempts(stream.attempt)) ? (r + 0.5) % 1 : r, run);
}
