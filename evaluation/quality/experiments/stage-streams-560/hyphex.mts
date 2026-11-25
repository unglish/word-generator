const root = process.argv[2];
const { generateWord } = await import(`${root}/src/index.ts`);
let n = 0;
for (let seed = 0; seed < 3000 && n < 8; seed++) for (const morphology of [false, true]) {
  const w = generateWord({ seed, mode: "lexicon", morphology });
  if (w.written.hyphenated.replaceAll("&shy;", "") !== w.written.clean) { n++; console.log(`seed ${seed} morphology:${morphology}  clean=${w.written.clean}  hyphenated=${w.written.hyphenated}`); }
}
