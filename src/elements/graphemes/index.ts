/**
 * Grapheme inventory barrel — re-exports the combined grapheme array and
 * pre-computed position maps used by the written-form generator.
 */
import { Grapheme } from "../../types.js";
import { vowelGraphemes } from "./vowels.js";
import { diphthongGraphemes } from "./diphthongs.js";
import { rhoticGraphemes } from "./rhotics.js";
import { glideGraphemes } from "./glides.js";
import { liquidGraphemes } from "./liquids.js";
import { nasalGraphemes } from "./nasals.js";
import { fricativeGraphemes } from "./fricatives.js";
import { affricateGraphemes } from "./affricates.js";
import { stopGraphemes } from "./stops.js";

export const ORIGINS = ["Germanic", "French", "Greek", "Latin", "Other"] as const;

export const graphemes: Grapheme[] = [
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

export const graphemeMaps = {
  onset: new Map<string, Grapheme[]>(),
  nucleus: new Map<string, Grapheme[]>(),
  coda: new Map<string, Grapheme[]>()
};

export const cumulativeFrequencies = {
  onset: new Map<string, number[]>(),
  nucleus: new Map<string, number[]>(),
  coda: new Map<string, number[]>()
};

/** Type-safe accessor for a grapheme's positional weight. */
function getPositionWeight(grapheme: Grapheme, position: 'onset' | 'nucleus' | 'coda'): number | undefined {
  switch (position) {
    case 'onset': return grapheme.onset;
    case 'nucleus': return grapheme.nucleus;
    case 'coda': return grapheme.coda;
  }
}

for (const position of ['onset', 'nucleus', 'coda'] as const) {
  for (const grapheme of graphemes) {
    const weight = getPositionWeight(grapheme, position);
    if (weight === undefined || weight > 0) {
      if (!graphemeMaps[position].has(grapheme.phoneme)) {
        graphemeMaps[position].set(grapheme.phoneme, []);
        cumulativeFrequencies[position].set(grapheme.phoneme, []);
      }
      const graphemeList = graphemeMaps[position].get(grapheme.phoneme)!;
      const frequencyList = cumulativeFrequencies[position].get(grapheme.phoneme)!;
      
      graphemeList.push(grapheme);
      const lastFreq = frequencyList.length > 0 ? frequencyList[frequencyList.length - 1] : 0;
      frequencyList.push(lastFreq + grapheme.frequency);
    }
  }
}
