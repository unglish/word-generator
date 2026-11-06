// Per-trigram attribution of the trigram JS delta between two checkouts,
// using the quality harness's exact streams (development seeds).
// usage: tsx trigram-attrib.mts <baseRoot> <headRoot> <harnessRoot>
import { readFileSync } from "node:fs";
const [baseRoot, headRoot, harness] = process.argv.slice(2);
const protocol = JSON.parse(readFileSync(`${harness}/evaluation/quality/protocol.json`, "utf8"));
const ref: Record<string, number> = JSON.parse(readFileSync(`${harness}/data/cmu/cmu-lexicon-trigrams.json`, "utf8"));

function probs(w: Record<string, number>) {
  const t = Object.values(w).reduce((a, b) => a + b, 0);
  return new Map(Object.entries(w).map(([k, v]) => [k, v / t]));
}
const R = probs(ref);
const contrib = (p: number, q: number) => {
  const m = p + q; let c = 0;
  if (p) c += p * (1 + Math.log2(p) - Math.log2(m));
  if (q) c += q * (1 + Math.log2(q) - Math.log2(m));
  return c / 2;
};

async function run(root: string, profile: any) {
  const api = await import(`${root}/src/index.ts`);
  const counts: Record<string, number> = {};
  const words = new Map<string, number>();
  for (const seed of profile.seeds.development) {
    const rand = api.createSeededRng(seed);
    for (let i = 0; i < protocol.wordsPerReplicate; i++) {
      const w = api.generateWord({ ...profile.options, rand, trace: true });
      const s = w.written.clean.toLowerCase();
      words.set(s, (words.get(s) ?? 0) + 1);
      for (let j = 0; j + 2 < s.length; j++) {
        const t = s.slice(j, j + 3);
        if (/^[a-z]{3}$/.test(t)) counts[t] = (counts[t] ?? 0) + 1;
      }
    }
  }
  return { counts, words };
}

const out: any = {};
for (const profile of protocol.profiles) {
  const a = await run(baseRoot, profile);
  const b = await run(headRoot, profile);
  const A = probs(a.counts), B = probs(b.counts);
  const keys = new Set([...A.keys(), ...B.keys(), ...R.keys()]);
  let jsA = 0, jsB = 0;
  const rows: any[] = [];
  for (const k of keys) {
    const r = R.get(k) ?? 0, pa = A.get(k) ?? 0, pb = B.get(k) ?? 0;
    const ca = contrib(pa, r), cb = contrib(pb, r);
    jsA += ca; jsB += cb;
    if (ca !== cb) rows.push({ k, ref: r, base: pa, head: pb, nBase: a.counts[k] ?? 0, nHead: b.counts[k] ?? 0, d: cb - ca });
  }
  rows.sort((x, y) => y.d - x.d);
  // Word-level: spellings that appear only in one side, by count.
  const onlyHead = [...b.words].filter(([w]) => !a.words.has(w)).sort((x, y) => y[1] - x[1]).length;
  const onlyBase = [...a.words].filter(([w]) => !b.words.has(w)).length;
  out[profile.id] = {
    jsBase: jsA, jsHead: jsB, delta: jsB - jsA,
    worse: rows.slice(0, 15).map(r => ({ ...r, ref: +r.ref.toFixed(5), base: +r.base.toFixed(5), head: +r.head.toFixed(5), d: +r.d.toExponential(2) })),
    better: rows.slice(-10).reverse().map(r => ({ ...r, ref: +r.ref.toFixed(5), base: +r.base.toFixed(5), head: +r.head.toFixed(5), d: +r.d.toExponential(2) })),
    sumWorse: rows.filter(r => r.d > 0).reduce((s, r) => s + r.d, 0),
    sumBetter: rows.filter(r => r.d < 0).reduce((s, r) => s + r.d, 0),
    onlyHead, onlyBase,
  };
  console.error(profile.id, (jsB - jsA).toFixed(5));
}
console.log(JSON.stringify(out, null, 1));
