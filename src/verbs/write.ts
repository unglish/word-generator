import getWeightedOption from "../utils/getWeightedOption.js";
import randomBool from "../utils/randomBool.js";
import { graphemes } from "../elements/graphemes.js";
import { Phoneme } from "../elements/phonemes.js";
import { Syllable } from "./generate.js";

export interface WrittenForm {
  clean: string;
  hyphenated: string;
}

function adjustSyllable(str: string): string {
  str = applySyllableReduction(str);
  str = applyCastling(str);
  return str;
}

function applyCastling(str: string): string {
  // This regex looks for 'e' that follows one of 'a', 'i', 'o', 'u', 'y' and is followed by one or more consonants
  // but not if the sequence ends with an 'e'
  // eg. styel -> style
  // eg. roed -> rode
  // eg. hedge -> hedge (unchanged)
  return str.replace(/([aiouy])e([bcdfghjklmnpqrstvwxyz]+)(?!e)/g, "$1$2e");
}

function applySyllableReduction(str: string): string {
  const reductionPairs = [
    { source: "(?<!^)ks", target: "x", likelihood: 0.25 }, // e., "nekst" -> "next"
  ];

  // Iterate over each pair and randomly decide whether to replace it
  reductionPairs.forEach((pair) => {
    if (randomBool(pair.likelihood)) {
      const regex = new RegExp(pair.source, "g");
      str = str.replace(regex, pair.target);
    }
  });

  return str;
}

function chooseGrapheme(
  phoneme: Phoneme,  
  position: string,
  isStartOfWord: boolean = false,
  isEndOfWord: boolean = false,
) { 
  const viableGraphemes = graphemes.filter(
    (grapheme) =>
      grapheme.phoneme === phoneme.sound &&
      (!grapheme.invalidPositions || grapheme.invalidPositions.indexOf(position as never) < 0) &&
      (isStartOfWord ? (!grapheme.start || grapheme.start > 0) : true) &&
      (isEndOfWord ? (!grapheme.end || grapheme.end > 0) : true)
  );

  // Ensure each tuple matches the structure [string, number]
  const weightedGraphemes: [string, number][] = viableGraphemes.map(
    (grapheme) => [
      grapheme.form, // This should be a string
      grapheme.frequency, // This should be a number
    ],
  );

  return getWeightedOption(weightedGraphemes);
}

export const write = (syllables: Syllable[]): WrittenForm => {
  let hyphenated = "";
  let clean = "";

  // Flatten syllables into an array of extended phonemes
  const flattenedPhonemes = syllables.flatMap((syllable, syllableIndex) =>
    ["onset", "nucleus", "coda"].flatMap((position) =>
      syllable[position as keyof Syllable].map((phoneme) => ({
        phoneme,
        syllableIndex,
        position,
      }))
    )
  );

  let currentSyllable = "";
  let currentSyllableIndex = 0;

  for (let phonemeIndex = 0; phonemeIndex < flattenedPhonemes.length; phonemeIndex++) {
    const { phoneme, syllableIndex, position } = flattenedPhonemes[phonemeIndex];
    const nextPhoneme = flattenedPhonemes[phonemeIndex + 1];

    const grapheme = chooseGrapheme(
      phoneme,
      position,
      phonemeIndex === 0,
      phonemeIndex === flattenedPhonemes.length - 1,
    );

    // Remove duplicate character at segment boundary
    if (currentSyllable.length > 0 && grapheme.length > 0 &&
        currentSyllable[currentSyllable.length - 1] === grapheme[0]) {
      currentSyllable += grapheme.slice(1);
    } else {
      currentSyllable += grapheme;
    }

    // If we're at the end of a syllable or the word
    if (!nextPhoneme || nextPhoneme.syllableIndex !== syllableIndex) {
      currentSyllable = adjustSyllable(currentSyllable);

      // Remove duplicate character at syllable boundary
      if (clean.length > 0 && currentSyllable.length > 0 &&
          clean[clean.length - 1] === currentSyllable[0]) {
        currentSyllable = currentSyllable.slice(1);
      }

      clean += currentSyllable;
      hyphenated += currentSyllable;

      if (nextPhoneme) {
        hyphenated += "&shy;";
      }

      currentSyllable = "";
      currentSyllableIndex++;
    }
  }

  return {
    clean,
    hyphenated,
  };
};

export default write;
