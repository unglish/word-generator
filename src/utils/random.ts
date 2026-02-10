/**
 * A random-number generator function that returns a value in [0, 1).
 */
export type RNG = () => number;

/** @deprecated Legacy alias — use {@link RNG} instead. */
export type RandomFunction = RNG;

/**
 * Create a deterministic RNG seeded with a 32-bit integer (Mulberry32).
 *
 * Excellent distribution, 4-line core, 32-bit state. Replaces the old
 * `Math.sin()` hack used in `createSeededRandom`.
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
    return ((r ^ (r >>> 14)) >>> 0) / 2 ** 32;
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

// ---------------------------------------------------------------------------
// Legacy global RNG (deprecated — use ctx.rand instead)
// ---------------------------------------------------------------------------

const xorshift: RNG = (() => {
  let state = Date.now();
  return () => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 2**32;
  };
})();

const rand: RNG = xorshift;
let currentRand: RNG = rand;

/** @deprecated Use `ctx.rand` (per-generator RNG) instead of the global singleton. */
export const getRand = (): RNG => currentRand;

/** @deprecated Use `ctx.rand` (per-generator RNG) instead of the global singleton. */
export const overrideRand = (randomFunc: RNG): void => {
  currentRand = randomFunc;
};

/** @deprecated Use `ctx.rand` (per-generator RNG) instead of the global singleton. */
export const resetRand = (): void => {
  currentRand = rand;
};
