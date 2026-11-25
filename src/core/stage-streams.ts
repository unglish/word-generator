/**
 * Per-stage random streams for one generated word (#556).
 *
 * The caller's stream (`options.rand`, or the seeded stream from
 * `options.seed`) gives each word one {@link StreamKey}. Every stage that draws
 * then gets its own Mulberry32 stream, seeded from that key, the stage name and
 * the root attempt. A change to how one stage draws leaves the draws of every
 * other stage unchanged. See `docs/stage-random-streams.md`.
 *
 * Internal: none of this is part of the package's public API, so the
 * derivation can change with a new {@link STAGE_STREAM_SCHEME}.
 */
import { createSeededRng, type RNG } from "../utils/random.js";

/**
 * Version of the derivation recorded in the trace. Bump it when any stream
 * changes: a stage name, the fold, or how the key is drawn. The known-answer
 * vectors in `stage-streams.test.ts` fail on any such change.
 */
export const STAGE_STREAM_SCHEME = "stage-streams/1";

/**
 * Stages that draw once per word, before the attempt loop. The affix plan has its
 * own stream so that affix changes leave the root length and edge draws alone.
 */
export const WORD_STAGES = ["set_constraints", "plan_morphology"] as const;

/**
 * Stages that draw for one root attempt. The finishing stages
 * (`finalize_root_spelling`, and `render_pronunciation` of an affixed word) run
 * for the selected attempt and use its streams.
 */
export const ATTEMPT_STAGES = [
  "plan_shape", "select_segments", "assign_stress", "post_stress_repair",
  "preview_morphology", "spell", "finalize_root_spelling", "render_pronunciation",
] as const;

export type WordStage = (typeof WORD_STAGES)[number];
export type AttemptStage = (typeof ATTEMPT_STAGES)[number];

/** Two 32-bit words drawn from a caller's stream; it keys every stage stream of one word. */
export interface StreamKey {
  readonly hi: number;
  readonly lo: number;
}

const UINT32_RANGE = 4294967296;

function drawUint32(rand: RNG): number {
  const r = rand();
  if (!(r >= 0 && r < 1)) throw new RangeError(`RNG must return a value in [0, 1), got ${r}`);
  return Math.floor(r * UINT32_RANGE) >>> 0;
}

/**
 * Draw a {@link StreamKey} from `rand`, `hi` then `lo`. This takes exactly two
 * draws, whatever `rand` is, so the caller's stream advances by a fixed amount.
 * Throws a `RangeError` when a draw is outside [0, 1).
 */
export function drawStreamKey(rand: RNG): StreamKey {
  const hi = drawUint32(rand);
  return { hi, lo: drawUint32(rand) };
}

/** MurmurHash3's 32-bit finaliser: a bijection that spreads every input bit. */
function fmix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** 32-bit FNV-1a hash of a stage name's UTF-16 code units. */
function hashStage(stage: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < stage.length; i++) h = Math.imul(h ^ stage.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

function fold(h: number, input: number): number {
  return fmix32(((h ^ input) + 0x9e3779b9) | 0);
}

/**
 * Seed of `stage`'s stream at `index` under `key`. Each 32-bit input is folded
 * in with `h = fmix32((h ^ input) + 0x9e3779b9)`, starting from the FNV offset
 * basis. The stage and index go in first: folding the key first would squeeze
 * it to 32 bits shared by every stream, so two keys that met there would give
 * two identical words. Folded last, the key reaches each stream's seed through
 * a different 64-to-32-bit map, and a seed collision in one stream does not
 * repeat in the others.
 */
export function deriveStreamSeed(key: StreamKey, stage: WordStage | AttemptStage, index: number): number {
  return fold(fold(fold(fold(0x811c9dc5, hashStage(stage)), index), key.hi), key.lo);
}

/**
 * A stand-in for code that runs outside any stage stream. Drawing from it is a
 * bug: give that code a stream with {@link inStage}.
 */
export function noStageDraws(where: string): RNG {
  return () => {
    throw new Error(`${where} has no random stream; give it one in src/core/stage-streams.ts.`);
  };
}

/** What a word's context holds between stages. */
export const BETWEEN_STAGES: RNG = noStageDraws("Code between generation stages");

/**
 * Run `run` with `context.rand` bound to `rand`, then put back what was bound
 * before. Contexts start with {@link BETWEEN_STAGES}, so outside every
 * `inStage` a draw throws.
 */
export function inStage<T>(context: { rand: RNG }, rand: RNG, run: () => T): T {
  const outer = context.rand;
  context.rand = rand;
  try {
    return run();
  } finally {
    context.rand = outer;
  }
}

/** One set of streams. A stage resumes its own stream each time it runs. */
export type StageStreams<Stage extends string> = (stage: Stage) => RNG;

/** The random streams of one generated word. */
export interface WordStreams {
  readonly key: StreamKey;
  readonly word: StageStreams<WordStage>;
  attempt(attempt: number): StageStreams<AttemptStage>;
}

export type AttemptStreams = StageStreams<AttemptStage>;

function streamsAt<Stage extends WordStage | AttemptStage>(key: StreamKey, index: number): StageStreams<Stage> {
  const streams = new Map<Stage, RNG>();
  return (stage) => {
    let stream = streams.get(stage);
    if (!stream) {
      stream = createSeededRng(deriveStreamSeed(key, stage, index));
      streams.set(stage, stream);
    }
    return stream;
  };
}

/**
 * Draw one word's stream key from `rand` (two draws) and return its stage
 * streams. Word stages use index 0; attempt `n` (0-based) uses index `n + 1`.
 */
export function createWordStreams(rand: RNG): WordStreams {
  const key = drawStreamKey(rand);
  return {
    key,
    word: streamsAt<WordStage>(key, 0),
    attempt: (attempt) => streamsAt<AttemptStage>(key, attempt + 1),
  };
}

/** The key as 16 hex digits, as recorded in the trace. */
export function formatStreamKey({ hi, lo }: StreamKey): string {
  return hi.toString(16).padStart(8, "0") + lo.toString(16).padStart(8, "0");
}
