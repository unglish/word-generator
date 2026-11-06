// Trigram JS (harness streams, development cohort) plus watched trigrams for one checkout.
// usage: tsx measure.mts <root> <harnessRoot> <label>
import { readFileSync } from "node:fs";
const [root, harness, label] = process.argv.slice(2);
const protocol = JSON.parse(readFileSync(`${harness}/evaluation/quality/protocol.json`, "utf8"));
const ref: Record<string, number> = JSON.parse(readFileSync(`${harness}/data/cmu/cmu-lexicon-trigrams.json`, "utf8"));
const probs = (w: Record<string, number>) => { const t = Object.values(w).reduce((a, b) => a + b, 0); return new Map(Object.entries(w).map(([k, v]) => [k, v / t])); };
const R = probs(ref);
const c = (p: number, q: number) => { const m = p + q; let x = 0; if (p) x += p * (1 + Math.log2(p) - Math.log2(m)); if (q) x += q * (1 + Math.log2(q) - Math.log2(m)); return x / 2; };
const api = await import(`${root}/src/index.ts`);
const watch = ["cst", "kst", "cts", "kts", "xt", "nch", "cht", "aun", "aus", "rau", "lau"];
const out: any = { label };
for (const profile of protocol.profiles) {
  const counts: Record<string, number> = {}; const uniq = new Set<string>(); let letters = 0, n = 0, xt = 0;
  for (const seed of profile.seeds.development) {
    const rand = api.createSeededRng(seed);
    for (let i = 0; i < protocol.wordsPerReplicate; i++) {
      const s = api.generateWord({ ...profile.options, rand, trace: true }).written.clean.toLowerCase();
      uniq.add(s); letters += s.length; n++; if (s.includes("xt")) xt++;
      for (let j = 0; j + 2 < s.length; j++) { const t = s.slice(j, j + 3); if (/^[a-z]{3}$/.test(t)) counts[t] = (counts[t] ?? 0) + 1; }
    }
  }
  const P = probs(counts); let js = 0;
  for (const k of new Set([...P.keys(), ...R.keys()])) js += c(P.get(k) ?? 0, R.get(k) ?? 0);
  out[profile.id] = { js: +js.toFixed(5), unique: uniq.size, meanLetters: +(letters / n).toFixed(3), wordsWithXt: xt,
    watch: Object.fromEntries(watch.filter(w => w.length === 3).map(w => [w, counts[w] ?? 0])) };
}
console.log(JSON.stringify(out));
