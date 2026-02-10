// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
/**
 * Validate a LanguageConfig, throwing on any detected inconsistency.
 *
 * Checks:
 * - `phonemes[]` contains every phoneme reachable through `phonemeMaps`
 * - `graphemes[]` contains every grapheme reachable through `graphemeMaps`
 * - All probability values in `generationWeights` are in [0, 100]
 *
 * Call this during development or at startup to catch config errors early.
 */
export function validateConfig(config) {
    // Check phonemes ⊇ phonemeMaps values
    const phonemeSet = new Set(config.phonemes);
    for (const position of ["onset", "nucleus", "coda"]) {
        for (const [sound, list] of config.phonemeMaps[position]) {
            for (const p of list) {
                if (!phonemeSet.has(p)) {
                    throw new Error(`phonemeMaps.${position} contains phoneme "${p.sound}" (key "${sound}") not found in phonemes[]`);
                }
            }
        }
    }
    // Check graphemes ⊇ graphemeMaps values
    const graphemeSet = new Set(config.graphemes);
    for (const position of ["onset", "nucleus", "coda"]) {
        for (const [sound, list] of config.graphemeMaps[position]) {
            for (const g of list) {
                if (!graphemeSet.has(g)) {
                    throw new Error(`graphemeMaps.${position} contains grapheme "${g.form}" (key "${sound}") not found in graphemes[]`);
                }
            }
        }
    }
    // Check probability values in range
    const { probability } = config.generationWeights;
    for (const [key, value] of Object.entries(probability)) {
        if (value < 0 || value > 100) {
            throw new Error(`generationWeights.probability.${key} is ${value}, must be in [0, 100]`);
        }
    }
}
/**
 * Compute sonority levels for every phoneme from the language config's
 * sonority hierarchy. This guarantees levels stay consistent with the
 * hierarchy — no stale cache possible.
 */
export function computeSonorityLevels(config) {
    const { mannerOfArticulation, placeOfArticulation, voicedBonus, tenseBonus } = config.sonorityHierarchy;
    return new Map(config.phonemes.map((p) => [
        p,
        (mannerOfArticulation[p.mannerOfArticulation] ?? 0) +
            (placeOfArticulation[p.placeOfArticulation] ?? 0) +
            (p.voiced ? voicedBonus : 0) +
            (p.tense ? tenseBonus : 0),
    ]));
}
