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
export declare function createSeededRng(seed: number): RNG;
/**
 * Create a non-deterministic RNG backed by `Math.random()`.
 *
 * @returns An {@link RNG} that delegates to `Math.random()`.
 */
export declare function createDefaultRng(): RNG;
/** @deprecated Use `ctx.rand` (per-generator RNG) instead of the global singleton. */
export declare const getRand: () => RNG;
/** @deprecated Use `ctx.rand` (per-generator RNG) instead of the global singleton. */
export declare const overrideRand: (randomFunc: RNG) => void;
/** @deprecated Use `ctx.rand` (per-generator RNG) instead of the global singleton. */
export declare const resetRand: () => void;
//# sourceMappingURL=random.d.ts.map