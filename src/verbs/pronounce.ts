function pronounceSyllable(syllable: {
  onset: any[];
  nucleus: any[];
  coda: any[];
}) {
  function reducePhonemes(acc: any, phoneme: { sound: any }) {
    return (acc += phoneme.sound);
  }

  let onset = "";
  if (syllable.onset.length)
    onset = syllable.onset.reduce(reducePhonemes, onset);
  let nucleus = "";
  if (syllable.nucleus.length)
    nucleus = syllable.nucleus.reduce(reducePhonemes, nucleus);
  let coda = "";
  if (syllable.coda.length) coda = syllable.coda.reduce(reducePhonemes, coda);

  return onset + "" + nucleus + "" + coda;
}

export default (word: { syllables: any[] }): string => {
  const { syllables } = word;
  let pronunciationGuide = "";

  for (let i = 0; i < syllables.length; i++) {
    pronunciationGuide += pronounceSyllable(syllables[i]);
  }

  return pronunciationGuide;
};
