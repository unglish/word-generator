/**
 * Create a deterministic RNG seeded with a 32-bit integer (Mulberry32).
 *
 * Excellent distribution, 4-line core, 32-bit state. Replaces the old
 * `Math.sin()` hack used in `createSeededRandom`.
 *
 * @param seed - Integer seed value.
 * @returns A deterministic {@link RNG}.
 */
export function createSeededRng(seed) {
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
export function createDefaultRng() {
    return () => Math.random();
}
// ---------------------------------------------------------------------------
// Legacy global RNG (deprecated — use ctx.rand instead)
// ---------------------------------------------------------------------------
const xorshift = (() => {
    let state = Date.now();
    return () => {
        state ^= state << 13;
        state ^= state >> 17;
        state ^= state << 5;
        return (state >>> 0) / 2 ** 32;
    };
})();
const rand = xorshift;
let currentRand = rand;
/** @deprecated Use `ctx.rand` (per-generator RNG) instead of the global singleton. */
export const getRand = () => currentRand;
/** @deprecated Use `ctx.rand` (per-generator RNG) instead of the global singleton. */
export const overrideRand = (randomFunc) => {
    currentRand = randomFunc;
};
/** @deprecated Use `ctx.rand` (per-generator RNG) instead of the global singleton. */
export const resetRand = () => {
    currentRand = rand;
};
