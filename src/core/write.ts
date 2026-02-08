import { Phoneme, Grapheme, WordGenerationContext } from "../types.js";
import { LanguageConfig } from "../config/language.js";
import { getRand } from '../utils/random';
import getWeightedOption from "../utils/getWeightedOption.js";

/**
 * Pre-computed cumulative frequency tables for a set of grapheme maps,
 * keyed by syllable position then phoneme sound.
 */
type CumulativeFrequencyTable = {
  onset: Map<string, number[]>;
  nucleus: Map<string, number[]>;
  coda: Map<string, number[]>;
};

/**
 * Build cumulative frequency lookup tables from grapheme maps.
 * Uses each grapheme's `frequency` field for weighting, matching the
 * original logic in `graphemes/index.ts`.
 */
function buildCumulativeFrequencies(
  graphemeMaps: LanguageConfig["graphemeMaps"],
): CumulativeFrequencyTable {
  const result: CumulativeFrequencyTable = {
    onset: new Map(),
    nucleus: new Map(),
    coda: new Map(),
  };

  for (const position of ["onset", "nucleus", "coda"] as const) {
    for (const [sound, graphemeList] of graphemeMaps[position]) {
      let cumulative = 0;
      const cumulatives: number[] = [];
      for (const g of graphemeList) {
        cumulative += g.frequency;
        cumulatives.push(cumulative);
      }
      result[position].set(sound, cumulatives);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Reduction rules (spelling adjustments)
//
// NOTE: These rules are English-specific (ks→x, magic-e). A future version
// should accept spelling rules via LanguageConfig so other languages can
// provide their own orthographic adjustments. See issue #31.
// ---------------------------------------------------------------------------

const reductionRules = [
  {
    pattern: /([aiouy])e([bcdfghjklmnpqrstvwxyz]+)(?!e)/g,
    replacement: (match: string, p1: string, p2: string) => getRand()() < 0.98 ? `${p1}${p2}e` : match,
  },
  {
    pattern: /(?<!^)ks/g,
    replacement: (match: string) => getRand()() < 0.25 ? 'x' : match,
  },
];

const compiledPatterns = reductionRules.map(rule => ({
  regex: new RegExp(rule.pattern.source, rule.pattern.flags),
  replacement: rule.replacement,
}));

function adjustSyllable(str: string): string {
  let result = str;
  for (const { regex, replacement } of compiledPatterns) {
    result = result.replace(regex, replacement);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Grapheme selection
// ---------------------------------------------------------------------------

function chooseGrapheme(
  graphemeMaps: LanguageConfig["graphemeMaps"],
  cumulativeFrequencies: CumulativeFrequencyTable,
  currPhoneme: Phoneme,
  position: "onset" | "nucleus" | "coda",
  isCluster: boolean = false,
  isStartOfWord: boolean = false,
  isEndOfWord: boolean = false,
  prevPhoneme?: Phoneme,
  nextPhoneme?: Phoneme,
): string {
  const graphemeList = graphemeMaps[position].get(currPhoneme.sound);
  const frequencyList = cumulativeFrequencies[position].get(currPhoneme.sound);
  if (!graphemeList || !frequencyList || graphemeList.length === 0) return '';

  const totalFrequency = frequencyList[frequencyList.length - 1];
  let randomValue = getRand()() * totalFrequency;

  let selectedGrapheme: Grapheme | undefined;
  for (let i = 0; i < graphemeList.length; i++) {
    const grapheme = graphemeList[i];
    if (
      (!isCluster || !grapheme.cluster || grapheme.cluster > 0) &&
      (!isStartOfWord || !grapheme.startWord || grapheme.startWord > 0) &&
      (!isEndOfWord || !grapheme.endWord || grapheme.endWord > 0) &&
      ((!isEndOfWord && !isStartOfWord) || grapheme.midWord > 0)
    ) {
      if (randomValue < frequencyList[i]) {
        selectedGrapheme = grapheme;
        break;
      }
    }
  }

  // Fallback to the first valid grapheme if none was selected
  if (!selectedGrapheme) {
    selectedGrapheme = graphemeList.find(g =>
      (!isCluster || !g.cluster || g.cluster > 0) &&
      (!isStartOfWord || !g.startWord || g.startWord > 0) &&
      (!isEndOfWord || !g.endWord || g.endWord > 0) &&
      ((!isEndOfWord && !isStartOfWord) || g.midWord > 0)
    ) || graphemeList[0];
  }

  let { form } = selectedGrapheme;

  // Apply the doubling rule (English-specific — see issue #31)
  if (prevPhoneme && prevPhoneme.nucleus && !isCluster) {
    const isAfterShortVowel = prevPhoneme.nucleus > 0 && prevPhoneme.tense === false;
    const isConsonant = position === "onset" || position === "coda";
    const mayDouble = isAfterShortVowel && isConsonant && currPhoneme.sound !== "v" && currPhoneme.mannerOfArticulation !== "glide" && form.length === 1;
    const shouldDouble = mayDouble ? getWeightedOption([[true, 80], [false, 20]]) : false;
    if (shouldDouble) {
      form += form;
    }
  }

  return form;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a `generateWrittenForm` function bound to the given language config's
 * grapheme maps. The cumulative frequency table is pre-computed once at creation.
 */
export function createWrittenFormGenerator(config: LanguageConfig): (context: WordGenerationContext) => void {
  const gMaps = config.graphemeMaps;
  const cumFreqs = buildCumulativeFrequencies(gMaps);

  return (context: WordGenerationContext) => {
    const { syllables, written } = context.word;
    const flattenedPhonemes = syllables.flatMap((syllable, syllableIndex) =>
      (["onset", "nucleus", "coda"] as const).flatMap((position) =>
        syllable[position].map((phoneme) => ({ phoneme, syllableIndex, position }))
      )
    );

    const cleanParts: string[] = [];
    const hyphenatedParts: string[] = [];
    let currentSyllable: string[] = [];

    for (let phonemeIndex = 0; phonemeIndex < flattenedPhonemes.length; phonemeIndex++) {
      const { phoneme, syllableIndex, position } = flattenedPhonemes[phonemeIndex];
      const prevPhoneme = flattenedPhonemes[phonemeIndex - 1];
      const nextPhoneme = flattenedPhonemes[phonemeIndex + 1];

      const isCluster =
        (prevPhoneme?.syllableIndex === syllableIndex && prevPhoneme?.position === position) ||
        (nextPhoneme?.syllableIndex === syllableIndex && nextPhoneme?.position === position);

      const grapheme = chooseGrapheme(
        gMaps,
        cumFreqs,
        phoneme,
        position,
        isCluster,
        phonemeIndex === 0,
        phonemeIndex === flattenedPhonemes.length - 1,
        prevPhoneme?.phoneme,
        nextPhoneme?.phoneme,
      );

      if (currentSyllable.length > 0 && grapheme.length > 0 &&
          currentSyllable[currentSyllable.length - 1].slice(-1) === grapheme[0]) {
        currentSyllable.push(grapheme.slice(1));
      } else {
        currentSyllable.push(grapheme);
      }

      if (!nextPhoneme || nextPhoneme.syllableIndex !== syllableIndex) {
        let syllableStr = adjustSyllable(currentSyllable.join(''));

        if (cleanParts.length > 0 && syllableStr.length > 0 &&
            cleanParts[cleanParts.length - 1].slice(-1) === syllableStr[0]) {
          syllableStr = syllableStr.slice(1);
        }

        cleanParts.push(syllableStr);
        hyphenatedParts.push(syllableStr);

        if (nextPhoneme) {
          hyphenatedParts.push("&shy;");
        }

        currentSyllable = [];
      }
    }

    written.clean = cleanParts.join('');
    written.hyphenated = hyphenatedParts.join('');
  };
}
