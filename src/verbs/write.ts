import getWeightedOption from "../utils/getWeightedOption.js";
import randomBool from "../utils/randomBool.js";
import { graphemes } from "../elements/graphemes.js";
import { Phoneme } from "../elements/phonemes.js";
import { Syllable } from "./generate.js";

export interface WrittenForm {
  clean: string;
  hyphenated: string;
}

function writeSyllable(syllable: Syllable): string {
  const segmentPositions: Array<"onset" | "nucleus" | "coda"> = [
    "onset",
    "nucleus",
    "coda",
  ];

  const writtenSyllable = segmentPositions.reduce(
    (written, segmentPosition) => {
      const segment = syllable[segmentPosition];
      return written + writeSegment(segment, segmentPosition);
    },
    "",
  );

  return adjustSyllable(writtenSyllable);
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
    { source: "uu", target: "u", likelihood: 1.0 },
    { source: "ww", target: "w", likelihood: 1.0 },
    { source: "ii", target: "i", likelihood: 1.0 },
    { source: "gg", target: "g", likelihood: 0.9 },
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

function writeSegment(phonemes: Phoneme[], position: string) {
  let writtenSegment = "";
  for (let i = 0, currPhoneme: Phoneme; i < phonemes.length; i++) {
    currPhoneme = phonemes[i];
    writtenSegment += chooseGrapheme(
      currPhoneme,
      position,
      phonemes.length > 1,
    );
  }
  return writtenSegment;
}

function chooseGrapheme(
  phoneme: Phoneme,  
  position: string, 
  inCluster: boolean,
) { 
  const viableGraphemes = graphemes.filter(
    (grapheme) =>
      grapheme.phoneme === phoneme.sound &&
      (!grapheme.invalidPositions || grapheme.invalidPositions.indexOf(position) < 0),
  );

  // Ensure each tuple matches the structure [string, number]
  const weightedGraphemes: [string, number][] = viableGraphemes.map(
    (grapheme) => [
      grapheme.form, // This should be a string
      grapheme.frequency, // This should be a number
    ],
  );

  return inCluster
    ? viableGraphemes[0].form
    : getWeightedOption(weightedGraphemes);
}

function applyWordReduction(str: string): string {
  const reductionPairs = [
    { source: "yy", target: "y", likelihood: 1.0 },
    { source: "hh", target: "h", likelihood: 1.0 },
    {
      source: "([a-zA-Z])\\1{2}", // Matches any letter followed by itself two more times
      target: "$1", // Replace with just one instance of the matched letter
      likelihood: 1.0,
    },
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

export const write = (syllables: Syllable[]): WrittenForm => {
  let hyphenated = "";
  let clean = "";

  for (let i = 0, newSyllable; i < syllables.length; i++) {
    newSyllable = writeSyllable(syllables[i]);
    clean += newSyllable;
    hyphenated += newSyllable;
    if (i < syllables.length - 1) hyphenated += "&shy;";
  }

  return {
    clean: applyWordReduction(clean),
    hyphenated: applyWordReduction(hyphenated),
  };
};

export default write;
