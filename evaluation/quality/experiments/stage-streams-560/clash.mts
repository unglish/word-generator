const root = process.argv[2]; const mode = process.argv[3];
const { generateWords } = await import(`${root}/src/index.ts`);
let di = 0, clash = 0;
for (let s = 1; s <= 30; s++) for (const w of generateWords(10_000, { seed: 9000 + s, mode })) {
  if (w.syllables.length !== 2) continue; di++;
  const st = w.syllables.map(x => x.stress).sort().join("");
  if (st === "ˈˌ" || st === "ˌˈ") clash++;
}
console.log(mode, root.endsWith("main") ? "main" : "branch", clash, di, (100 * clash / di).toFixed(3));
