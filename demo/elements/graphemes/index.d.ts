/**
 * Grapheme inventory barrel — re-exports the combined grapheme array and
 * pre-computed position maps used by the written-form generator.
 */
import { Grapheme } from "../../types.js";
export declare const ORIGINS: readonly ["Germanic", "French", "Greek", "Latin", "Other"];
export declare const graphemes: Grapheme[];
export type GraphemeMaps = {
    onset: Map<string, Grapheme[]>;
    nucleus: Map<string, Grapheme[]>;
    coda: Map<string, Grapheme[]>;
};
export type CumulativeFrequencies = {
    onset: Map<string, number[]>;
    nucleus: Map<string, number[]>;
    coda: Map<string, number[]>;
};
/**
 * Build position-keyed grapheme maps and cumulative frequency tables
 * from a flat array of graphemes. Extracted from the former top-level
 * imperative loop so it can be tested and reused independently.
 */
export declare function buildGraphemeMaps(allGraphemes: Grapheme[]): {
    graphemeMaps: GraphemeMaps;
    cumulativeFrequencies: CumulativeFrequencies;
};
export declare const graphemeMaps: GraphemeMaps;
export declare const cumulativeFrequencies: CumulativeFrequencies;
//# sourceMappingURL=index.d.ts.map