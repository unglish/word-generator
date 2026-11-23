import { resolve } from "node:path";
const { generateWord, createGenerator, englishConfig } = await import(resolve("src/index.ts"));
const baselinePath = process.env.BASELINE_ROOT ?? "/private/tmp/unglish-repetition/baseline";
const { generateWord: before } = await import(resolve(baselinePath, "src/index.ts"));
const { generateWord: noReductionPenalty } = createGenerator({
  ...englishConfig,
  rootRepetition: { ...englishConfig.rootRepetition, tripleReductionMultiplier: 1 },
});
const options = (seed: number) => ({ seed, trace: true, mode: "lexicon" });
const snapshot = (word: any, name: string) => word.trace.stages.find((stage: any) => stage.name === name).after;
const root = (word: any, stage: string) => {
  const syllables = snapshot(word, stage);
  if (stage === "generateSyllables") return syllables;
  const start = word.lexical.rootSyllableStart;
  return syllables.slice(start, start + word.lexical.root.length);
};
const shape = (rows: any[]) => rows.map(({ onset, nucleus, coda }) => [
  onset.join(""), nucleus.join(""), coda.join(""),
]);
const record = (word: any) => ({
  spelling: word.written.clean, ipa: word.pronunciation,
  generated: shape(root(word, "generateSyllables")),
  lexical: word.lexical.root.map(({onset,nucleus,coda}: any) => [onset, nucleus, coda].map(part => part.map((p: any) => p.sound).join(""))),
  surface: shape(root(word, "generatePronunciation")),
});
const rows: Record<string, any> = {};
const hasLL = (word: any) => root(word, "generateSyllables").some((s: any) => s.onset.at(-1) === "l" && s.coda[0] === "l");
const triple = (seq: any[]) => seq.some(
  (syllable, i) => i >= 2 && syllable.nucleus[0] === seq[i - 1].nucleus[0] && syllable.nucleus[0] === seq[i - 2].nucleus[0],
);
for (let seed = 5000000; seed < 5020000 && Object.keys(rows).length < 3; seed++) {
  const fixed = generateWord(options(seed));
  const original = before(options(seed));
  if (!rows.l && hasLL(original) && !hasLL(fixed)) rows.l = { seed, before: record(original), after: record(fixed) };
  if (!rows.lexicalTriple && triple(root(original, "generateSyllables")) && !triple(root(fixed, "generateSyllables"))) {
    rows.lexicalTriple = { seed, before: record(original), after: record(fixed) };
  }
  if (!rows.reductionOnly) {
    const noPenalty = noReductionPenalty(options(seed));
    if (triple(root(noPenalty, "generatePronunciation")) && !triple(root(fixed, "generatePronunciation"))) {
      rows.reductionOnly = { seed, before: record(noPenalty), after: record(fixed) };
    }
  }
}
console.log(JSON.stringify(rows, null, 2));
