import { pathToFileURL } from "node:url";
const [root] = process.argv.slice(2);
const { generateWord } = await import(pathToFileURL(root + "/src/index.ts"));
const hit = s => s.some(x => x.onset.at(-1) === "r" && (x.nucleus.includes("ɚ") || x.coda.includes("r")));
let gen = 0, rep = 0;
for (let seed = 3000000; seed < 3020000 && (gen < 2 || rep < 2); seed++) {
  const w = generateWord({ mode: "lexicon", seed, trace: true });
  const st = w.trace.stages.find(s => hit(s.after));
  if (!st) continue;
  const kind = st.name === "generateSyllables" ? "gen" : "rep";
  if (kind === "gen" ? gen++ >= 2 : rep++ >= 2) continue;
  const prev = w.trace.stages[w.trace.stages.indexOf(st) - 1];
  console.log(seed, w.written.clean, w.pronunciation, st.name, JSON.stringify(prev?.after), "->", JSON.stringify(st.after), w.trace.repairs.map(r => `${r.rule}:${r.before}>${r.after}`).join(","));
}
