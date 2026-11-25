const root = process.argv[2];
const { generateWord } = await import(`${root}/src/index.ts`);
const { isDeepStrictEqual } = await import("node:util");
let bare = 0, same = 0; const diff: string[] = [];
for (let seed = 0; seed < 2000; seed++) {
  const on = generateWord({ seed, mode: "lexicon", morphology: true, trace: true });
  const tpl = on.trace?.morphology?.template ?? "bare";
  if (tpl !== "bare") continue;
  bare++;
  const off = generateWord({ seed, mode: "lexicon", morphology: false });
  const { trace, ...a } = on;
  if (isDeepStrictEqual(a, off)) same++; else if (diff.length < 3) diff.push(`${seed}: ${a.written.clean} vs ${off.written.clean}`);
}
console.log({ bare, same, diff });
