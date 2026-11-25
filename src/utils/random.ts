/**
 * A random-number generator function that returns a value in [0, 1).
 */
export type RNG = () => number;

/**
 * Create a deterministic RNG seeded with a 32-bit integer (Mulberry32).
 *
 * @param seed - Integer seed value.
 * @returns A deterministic {@link RNG}.
 */
export function createSeededRng(seed: number): RNG {
  let t = seed | 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a non-deterministic RNG backed by `Math.random()`.
 *
 * @returns An {@link RNG} that delegates to `Math.random()`.
 */
export function createDefaultRng(): RNG {
  return () => Math.random();
}

/** Two 32-bit words drawn from a caller's stream; it keys every derived stream. */
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
 * Draw a {@link StreamKey} from `rand`. This takes exactly two draws, whatever
 * `rand` is, so the caller's stream advances by a fixed amount. Throws a
 * `RangeError` when a draw is outside [0, 1).
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

/** 32-bit FNV-1a hash of a label's UTF-16 code units. */
export function hashLabel(label: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/**
 * Seed for the stream named by `labelHash` and `index` under `key`. Each 32-bit
 * input is folded in with `h = fmix32((h ^ input) + 0x9e3779b9)`, starting from
 * the FNV offset basis. The label and index go in first: folding the key first
 * would squeeze it to 32 bits shared by every stream, so two keys that met
 * there would give two identical words. Folded last, the key reaches each
 * stream's seed through a different 64-to-32-bit map, and a seed collision in
 * one stream does not repeat in the others.
 */
export function deriveStreamSeed(key: StreamKey, labelHash: number, index: number): number {
  return fold(fold(fold(fold(0x811c9dc5, labelHash), index), key.hi), key.lo);
}

function fold(h: number, input: number): number {
  return fmix32(((h ^ input) + 0x9e3779b9) | 0);
}

/** A Mulberry32 stream seeded by {@link deriveStreamSeed}. */
export function createDerivedRng(key: StreamKey, labelHash: number, index: number): RNG {
  return createSeededRng(deriveStreamSeed(key, labelHash, index));
}
