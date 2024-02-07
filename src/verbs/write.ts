import { getWeightedOption, randomBool } from "../utils";
import { graphemes } from "../elements/graphemes.js";

function writeSyllable(syllable: { [x: string]: any }) {
  let writtenSyllable = "";
  const segmentPositions = ["onset", "nucleus", "coda"];
  for (
    let i = 0, currSegmentPosition, currSegment;
    i < segmentPositions.length;
    i++
  ) {
    currSegmentPosition = segmentPositions[i];
    currSegment = syllable[currSegmentPosition];
    writtenSyllable += writeSegment(currSegment, currSegmentPosition);
  }
  writtenSyllable = adjustSyllable(writtenSyllable);
  return writtenSyllable;
}

function adjustSyllable(str: string) {
  str = applySyllableReduction(str);
  str = applyCastling(str);
  return str;
}

function applyCastling(str: string) {
  // This regex looks for 'e' that follows one of 'a', 'i', 'o', 'u', 'y' and is followed by one or more consonants
  // but not if the sequence ends with an 'e'
  // eg. styel -> style
  // eg. roed -> rode
  // eg. hedge -> hedge (unchanged)
  return str.replace(/([aiouy])e([bcdfghjklmnpqrstvwxyz]+)(?!e)/g, "$1$2e");
}

function applySyllableReduction(str: string) {
  const reductionPairs = [
    { source: "(?<!^)ks", target: "x", likelihood: 0.75 }, // e., "nekst" -> "next"
    { source: "uu", target: "u", likelihood: 1.0 },
    { source: "ww", target: "w", likelihood: 1.0 },
    { source: "ii", target: "i", likelihood: 1.0 },
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

function writeSegment(segment: string | any[], position: string) {
  let writtenSegment = "";
  for (let i = 0, currPhoneme; i < segment.length; i++) {
    currPhoneme = segment[i];
    writtenSegment += chooseGrapheme(currPhoneme, position, segment.length > 1);
  }
  return writtenSegment;
}

function chooseGrapheme(
  phoneme: { sound: string },
  position: string,
  inCluster: boolean,
) {
  const viableGraphemes = graphemes.filter(
    (grapheme) =>
      grapheme.phoneme == phoneme.sound &&
      grapheme.invalidPositions.indexOf(position) < 0,
  );
  const weightedGraphemes = viableGraphemes.map((grapheme) => [
    grapheme.form,
    grapheme.frequency,
  ]);
  return inCluster
    ? viableGraphemes[0].form
    : getWeightedOption(weightedGraphemes);
}

function applyWordReduction(str: string) {
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

export default (word: { syllables: any }) => {
  const { syllables } = word;
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
