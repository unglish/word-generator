import { vowelGraphemes } from "./vowels.js";
import { diphthongGraphemes } from "./diphthongs.js";
import { rhoticGraphemes } from "./rhotics.js";
import { glideGraphemes } from "./glides.js";
import { liquidGraphemes } from "./liquids.js";
import { nasalGraphemes } from "./nasals.js";
import { fricativeGraphemes } from "./fricatives.js";
import { affricateGraphemes } from "./affricates.js";
import { stopGraphemes } from "./stops.js";
export const ORIGINS = ["Germanic", "French", "Greek", "Latin", "Other"];
export const graphemes = [
    ...vowelGraphemes,
    ...diphthongGraphemes,
    ...rhoticGraphemes,
    ...glideGraphemes,
    ...liquidGraphemes,
    ...nasalGraphemes,
    ...fricativeGraphemes,
    ...affricateGraphemes,
    ...stopGraphemes,
];
/** Type-safe accessor for a grapheme's positional weight. */
function getPositionWeight(grapheme, position) {
    switch (position) {
        case 'onset': return grapheme.onset;
        case 'nucleus': return grapheme.nucleus;
        case 'coda': return grapheme.coda;
    }
}
/**
 * Build position-keyed grapheme maps and cumulative frequency tables
 * from a flat array of graphemes. Extracted from the former top-level
 * imperative loop so it can be tested and reused independently.
 */
export function buildGraphemeMaps(allGraphemes) {
    const graphemeMaps = {
        onset: new Map(),
        nucleus: new Map(),
        coda: new Map()
    };
    const cumulativeFrequencies = {
        onset: new Map(),
        nucleus: new Map(),
        coda: new Map()
    };
    for (const position of ['onset', 'nucleus', 'coda']) {
        for (const grapheme of allGraphemes) {
            const weight = getPositionWeight(grapheme, position);
            if (weight === undefined || weight > 0) {
                if (!graphemeMaps[position].has(grapheme.phoneme)) {
                    graphemeMaps[position].set(grapheme.phoneme, []);
                    cumulativeFrequencies[position].set(grapheme.phoneme, []);
                }
                const graphemeList = graphemeMaps[position].get(grapheme.phoneme);
                const frequencyList = cumulativeFrequencies[position].get(grapheme.phoneme);
                graphemeList.push(grapheme);
                const lastFreq = frequencyList.length > 0 ? frequencyList[frequencyList.length - 1] : 0;
                frequencyList.push(lastFreq + grapheme.frequency);
            }
        }
    }
    return { graphemeMaps, cumulativeFrequencies };
}
const { graphemeMaps: _maps, cumulativeFrequencies: _freqs } = buildGraphemeMaps(graphemes);
export const graphemeMaps = _maps;
export const cumulativeFrequencies = _freqs;
