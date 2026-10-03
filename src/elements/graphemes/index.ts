/**
 * Grapheme inventory barrel — re-exports the combined grapheme array and
 * pre-computed position maps used by the written-form generator.
 */
import { withEnglishOriginAssessments } from "./origin-assessment.js";
export { englishOriginSources } from "./origin-assessment.js";
export { englishStyleExperiment } from "./style-experiment.js";
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
import { withEnglishReadings } from "./reading.js";

export const ORIGINS = ["Germanic", "French", "Greek", "Latin", "Other"] as const;

/** Vowel weights were tuned by syllable, including an explicit isolated-syllable case.
 * Consonant weights describe actual segment edges (e.g. coda /z/ in the first
 * syllable is medial, not word-initial). Keep these dimensions separate.
 */
function withPositions(items: Grapheme[], scope: "segment" | "syllable"): Grapheme[] {
  return items.map(grapheme => {
    const positionScope = grapheme.positionScope ?? scope;
    // Preserve the old positive intersection where it existed. /eɪ/ had no
    // such intersection at all, so its isolated spellings need their own
    // explicit licensing rather than the former implicit restoration.
    const hasBothEdges = items.some(candidate =>
      candidate.phoneme === grapheme.phoneme && candidate.startWord > 0 && candidate.endWord > 0
    );
    const isolatedAllowed = !hasBothEdges || (grapheme.startWord > 0 && grapheme.endWord > 0);
    return {
      ...grapheme,
      positionScope,
      ...(positionScope === "syllable" ? {
        isolatedSyllableWeight: isolatedAllowed
          ? Math.max(grapheme.startWord, grapheme.midWord, grapheme.endWord) : 0,
      } : {}),
    };
  });
}

export const graphemes: Grapheme[] = withEnglishOriginAssessments(withEnglishReadings([
  ...withPositions(vowelGraphemes, "syllable"),
  ...withPositions(diphthongGraphemes, "syllable"),
  ...withPositions(rhoticGraphemes, "syllable"),
  ...withPositions(glideGraphemes, "segment"),
  ...withPositions(liquidGraphemes, "segment"),
  ...withPositions(nasalGraphemes, "segment"),
  ...withPositions(fricativeGraphemes, "segment"),
  ...withPositions(affricateGraphemes, "segment"),
  ...withPositions(stopGraphemes, "segment"),
  // These alternatives preserve hard contextual bans when the legacy vowel
  // preferences leave an initial syllable unspellable. They are not eligible
  // until every ordinary candidate has been excluded.
  {
    phoneme: "ɛ", form: "ea", origin: 0, frequency: 140,
    onset: 0, coda: 0, positionScope: "syllable", fallbackOnly: true,
    startWord: 1, midWord: 0, endWord: 0, isolatedSyllableWeight: 10,
    condition: { rightContext: ["t"] },
  },
  {
    phoneme: "ʊ", form: "oo", origin: 0, frequency: 80,
    onset: 0, coda: 0, positionScope: "syllable", fallbackOnly: true,
    startWord: 1, midWord: 0, endWord: 0, isolatedSyllableWeight: 5,
    condition: { leftContext: ["g"] },
  },
]), ORIGINS);

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

/** Type-safe accessor for a grapheme's positional weight. */
function getPositionWeight(grapheme: Grapheme, position: "onset" | "nucleus" | "coda"): number | undefined {
  switch (position) {
  case "onset": return grapheme.onset;
  case "nucleus": return grapheme.nucleus;
  case "coda": return grapheme.coda;
  }
}

/**
 * Build position-keyed grapheme maps and cumulative frequency tables
 * from a flat array of graphemes. Extracted from the former top-level
 * imperative loop so it can be tested and reused independently.
 */
export function buildGraphemeMaps(allGraphemes: Grapheme[]): {
  graphemeMaps: GraphemeMaps;
  cumulativeFrequencies: CumulativeFrequencies;
} {
  const graphemeMaps: GraphemeMaps = {
    onset: new Map<string, Grapheme[]>(),
    nucleus: new Map<string, Grapheme[]>(),
    coda: new Map<string, Grapheme[]>()
  };

  const cumulativeFrequencies: CumulativeFrequencies = {
    onset: new Map<string, number[]>(),
    nucleus: new Map<string, number[]>(),
    coda: new Map<string, number[]>()
  };

  for (const position of ["onset", "nucleus", "coda"] as const) {
    for (const grapheme of allGraphemes) {
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

  return { graphemeMaps, cumulativeFrequencies };
}

const { graphemeMaps: _maps, cumulativeFrequencies: _freqs } = buildGraphemeMaps(graphemes);
export const graphemeMaps = _maps;
export const cumulativeFrequencies = _freqs;
