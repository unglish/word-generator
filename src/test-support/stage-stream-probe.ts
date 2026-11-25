/**
 * A test probe on the per-stage random streams (#556). It can count each stage
 * stream's draws, or shift one stage's draws to show which outputs read it.
 *
 * Since each stage has its own stream, a change that adds a draw at the end of
 * a stage's stream leaves every word the same. Comparing words therefore cannot
 * show that a change draws nothing; comparing the draws {@link withStageDraws} counts can.
 *
 * Install it at the top of a test file (the factory must import the probe
 * itself, because `vi.mock` is hoisted above the file's imports):
 *
 * ```ts
 * vi.mock("../core/stage-streams.js", async (original) =>
 *   (await import("../test-support/stage-stream-probe.js")).probeStageStreams(await original()));
 * ```
 *
 * Idle, the probe passes every draw through unchanged.
 *
 * Not part of the published build (excluded in tsconfig.json).
 */
import type { AttemptStage, WordStage, WordStreams } from "../core/stage-streams.js";
import type { RNG } from "../utils/random.js";

export type Stage = WordStage | AttemptStage;

/** Draws per stream: `stage` for a word stage, `stage#n` for attempt `n` (0-based). */
export type StageDraws = Record<string, number>;

const state: {
  installed?: boolean;
  counts?: StageDraws;
  shift?: { stage: Stage; attempts: (attempt: number) => boolean };
} = {};

function probe(rng: RNG, stage: Stage, label: string, attempt?: number): RNG {
  return () => {
    const r = rng();
    if (state.counts) state.counts[label] = (state.counts[label] ?? 0) + 1;
    const shift = state.shift;
    if (shift?.stage === stage && (attempt === undefined || shift.attempts(attempt))) return (r + 0.5) % 1;
    return r;
  };
}

/** Wrap `createWordStreams` in a mocked `stage-streams` module. */
export function probeStageStreams<M extends { createWordStreams: (rand: RNG) => WordStreams }>(actual: M): M {
  state.installed = true;
  return {
    ...actual,
    createWordStreams: (rand: RNG): WordStreams => {
      const streams = actual.createWordStreams(rand);
      return {
        key: streams.key,
        word: (stage) => probe(streams.word(stage), stage, stage),
        attempt: (attempt) => {
          const inner = streams.attempt(attempt);
          return (stage) => probe(inner(stage), stage, `${stage}#${attempt}`, attempt);
        },
      };
    },
  };
}

/**
 * Run `run`, counting the draws of every stage stream it reads. Throws when the
 * probe is not installed, so a missing `vi.mock` cannot pass as zero draws.
 */
export function withStageDraws<T>(run: () => T): { value: T; draws: StageDraws } {
  if (!state.installed) throw new Error("Install the stage stream probe with vi.mock first; see stage-stream-probe.ts.");
  const outer = state.counts;
  const draws: StageDraws = {};
  state.counts = draws;
  try {
    return { value: run(), draws };
  } finally {
    state.counts = outer;
  }
}

/**
 * Run `run` with `stage`'s draws moved by half the unit interval, `(r + 0.5) % 1`.
 * `attempts` limits an attempt stage's shift to some root attempts.
 */
export function withShiftedStage<T>(stage: Stage, run: () => T, attempts: (attempt: number) => boolean = () => true): T {
  const outer = state.shift;
  state.shift = { stage, attempts };
  try {
    return run();
  } finally {
    state.shift = outer;
  }
}
