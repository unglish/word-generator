const m = await import("<scratch>/w470/src/index.ts");
const { codaLimit, ...silentE } = m.englishConfig.silentE;
const a = m.createGenerator(m.englishConfig), b = m.createGenerator({ ...m.englishConfig, silentE });
let words = 0, pron = 0;
for (let seed = 2_000_000; seed < 2_020_000; seed++) {
  const x = a.generateWord({ seed }), y = b.generateWord({ seed });
  if (x.written.clean !== y.written.clean) words++;
  if (x.pronunciation !== y.pronunciation) pron++;
}
console.log("codaLimit alone changes", words, "words;", pron, "pronunciations");
