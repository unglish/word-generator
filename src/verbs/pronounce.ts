import { Phoneme } from "../elements/phonemes";
import { Syllable } from "./generate";

const reducePhonemes = (acc: string, phoneme: Phoneme): string => {
  return acc + phoneme.sound;
};

const pronounceSyllable = (syllable: Syllable): string => {
  const onset = syllable.onset.reduce(reducePhonemes, "");
  const nucleus = syllable.nucleus.reduce(reducePhonemes, "");
  const coda = syllable.coda.reduce(reducePhonemes, "");

  return onset + nucleus + coda;
};

export default (syllables: Syllable[]): string => {
  let pronunciationGuide = "";

  for (let i = 0; i < syllables.length; i++) {
    pronunciationGuide += pronounceSyllable(syllables[i]);
  }

  return pronunciationGuide;
};
