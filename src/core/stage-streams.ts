/**
 * Per-stage random streams for one generated word (#556).
 *
 * The caller's stream (`options.rand`, or the seeded stream from
 * `options.seed`) gives each word one {@link StreamKey}. Every stage that draws
 * then gets its own Mulberry32 stream, seeded from that key, the stage name and
 * the root attempt. A change to how one stage draws leaves the draws of every
 * other stage unchanged. See `docs/stage-random-streams.md`.
 */
import {
  createDerivedRng, drawStreamKey, hashLabel, type RNG, type StreamKey,
} from "../utils/random.js";

/** Version of the derivation recorded in the trace. Bump it when any stream changes. */
export const STAGE_STREAM_SCHEME = "stage-streams/1";

/**
 * Stages that draw once per word, before the attempt loop. The affix plan has its
 * own stream so that affix changes leave the root length and edge draws alone.
 */
export type WordStage = "set_constraints" | "plan_morphology";

/**
 * Stages that draw for one root attempt. The finishing stages
 * (`finalize_root_spelling`, `render_pronunciation` of an affixed word) run for
 * the selected attempt and use its streams.
 */
export type AttemptStage =
  | "plan_shape"
  | "select_segments"
  | "assign_stress"
  | "post_stress_repair"
  | "preview_morphology"
  | "spell"
  | "finalize_root_spelling"
  | "render_pronunciation";

const WORD_STAGES: readonly WordStage[] = ["set_constraints", "plan_morphology"];
const ATTEMPT_STAGES: readonly AttemptStage[] = [
  "plan_shape", "select_segments", "assign_stress", "post_stress_repair",
  "preview_morphology", "spell", "finalize_root_spelling", "render_pronunciation",
];

const STAGE_HASHES: ReadonlyMap<string, number> = new Map(
  [...WORD_STAGES, ...ATTEMPT_STAGES].map((stage) => [stage, hashLabel(stage)]),
);

function stageHash(stage: WordStage | AttemptStage): number {
  return STAGE_HASHES.get(stage)!;
}

/**
 * Stand-in for stages that draw nothing (`repair`, `score`, `attach_morphology`).
 * A draw there is a bug: give the stage a stream first.
 */
export const NO_STAGE_DRAWS: RNG = () => {
  throw new Error("This generation stage has no random stream; add one in src/core/stage-streams.ts.");
};

/** One attempt's streams. A stage resumes its own stream when it runs again in the same attempt. */
export type AttemptStreams = (stage: AttemptStage) => RNG;

/** The random streams of one generated word. */
export interface WordStreams {
  readonly key: StreamKey;
  word(stage: WordStage): RNG;
  attempt(attempt: number): AttemptStreams;
}

/**
 * Draw one word's stream key from `rand` (two draws) and return its stage
 * streams. Word stages use index 0; attempt `n` (0-based) uses index `n + 1`.
 */
export function createWordStreams(rand: RNG): WordStreams {
  const key = drawStreamKey(rand);
  return {
    key,
    word: (stage) => createDerivedRng(key, stageHash(stage), 0),
    attempt: (attempt) => {
      const streams = new Map<AttemptStage, RNG>();
      return (stage) => {
        let stream = streams.get(stage);
        if (!stream) {
          stream = createDerivedRng(key, stageHash(stage), attempt + 1);
          streams.set(stage, stream);
        }
        return stream;
      };
    },
  };
}

/** The key as 16 hex digits, as recorded in the trace. */
export function formatStreamKey({ hi, lo }: StreamKey): string {
  return hi.toString(16).padStart(8, "0") + lo.toString(16).padStart(8, "0");
}
