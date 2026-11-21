// usage: ngram.mts <src/index.ts> <seed> [N] ; prints worst under/over-rep bigram and listed bigrams
import { readFileSync } from "node:fs";
const [, , src, seedArg, nArg] = process.argv;
const { generateWords } = await import(src);
const root = "<scratch>/w469/data/cmu/";
const load = (f: string) => { const raw = JSON.parse(readFileSync(root + f, "utf8")); const t = Object.values(raw as Record<string, number>).reduce((a, b) => a + b, 0); return Object.fromEntries(Object.entries(raw as Record<string, number>).map(([k, v]) => [k, v / t])); };
const cmu2 = load("cmu-lexicon-bigrams.json");
const words = generateWords(Number(nArg ?? 200000), { seed: Number(seedArg) });
const bc: Record<string, number> = {}; let bt = 0;
for (const w of words) { const t = w.written.clean.toLowerCase(); for (let i = 0; i < t.length - 1; i++) { const b = t.slice(i, i + 2); bc[b] = (bc[b] ?? 0) + 1; bt++; } }
const under = Object.entries(cmu2).filter(([, f]) => f > 0.001).map(([b, f]) => [b, ((bc[b] ?? 0) / bt) / f] as [string, number]).sort((a, b) => a[1] - b[1]);
const over = Object.entries(bc).filter(([b]) => (cmu2[b] ?? 0) > 0.001).map(([b, c]) => [b, (c / bt) / cmu2[b]] as [string, number]).sort((a, b) => b[1] - a[1]);
console.log("seed", seedArg, "under", under.slice(0, 4).map(([b, r]) => `${b}:${r.toFixed(4)}`).join(" "), "over", over.slice(0, 2).map(([b, r]) => `${b}:${r.toFixed(3)}`).join(" "),
  "| " + ["cc", "mc", "ck", "sc", "lk", "rk", "sk"].map((b) => `${b}:${(((bc[b] ?? 0) / bt) / cmu2[b]).toFixed(4)}`).join(" "));
