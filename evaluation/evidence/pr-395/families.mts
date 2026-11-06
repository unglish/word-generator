// Monosyllable trigram-JS delta grouped by trigram family, plus a noise floor
// (main development vs main validation) for every profile.
import { readFileSync } from "node:fs";
const [baseRoot, headRoot, harness] = process.argv.slice(2);
const protocol = JSON.parse(readFileSync(`${harness}/evaluation/quality/protocol.json`, "utf8"));
const ref: Record<string, number> = JSON.parse(readFileSync(`${harness}/data/cmu/cmu-lexicon-trigrams.json`, "utf8"));
const probs = (w: Record<string, number>) => { const t = Object.values(w).reduce((a, b) => a + b, 0); return new Map(Object.entries(w).map(([k, v]) => [k, v / t])); };
const R = probs(ref);
const c = (p: number, q: number) => { const m = p + q; let x = 0; if (p) x += p * (1 + Math.log2(p) - Math.log2(m)); if (q) x += q * (1 + Math.log2(q) - Math.log2(m)); return x / 2; };
const apis: Record<string, any> = { base: await import(`${baseRoot}/src/index.ts`), head: await import(`${headRoot}/src/index.ts`) };
function counts(api: any, profile: any, cohort: string) {
  const out: Record<string, number> = {};
  for (const seed of profile.seeds[cohort]) {
    const rand = api.createSeededRng(seed);
    for (let i = 0; i < protocol.wordsPerReplicate; i++) {
      const s = api.generateWord({ ...profile.options, rand, trace: true }).written.clean.toLowerCase();
      for (let j = 0; j + 2 < s.length; j++) { const t = s.slice(j, j + 3); if (/^[a-z]{3}$/.test(t)) out[t] = (out[t] ?? 0) + 1; }
    }
  }
  return probs(out);
}
const js = (A: Map<string, number>) => { let s = 0; for (const k of new Set([...A.keys(), ...R.keys()])) s += c(A.get(k) ?? 0, R.get(k) ?? 0); return s; };
const families: [string, RegExp][] = [
  ["k+s/t codas (ck/k/c/x before s,t)", /^(.?(ck|k|c|x)[st]|[aeiouy]k[a-z]|[aeiouy]c[st]|[st]ck)$/],
  ["nasal + ch/th/g (nch, ngth, gth, cht)", /(nch|ncht|ch|ngt|gth|ngth|nk)/],
  ["other n-before-consonant (nt, nts, rn, on, an)", /n/],
  ["au/aw vowels", /au|aw/],
  ["lf/lft/fth", /lf|ft|fth/],
];
const out: any = {};
for (const profile of protocol.profiles) {
  const dev = counts(apis.base, profile, "development");
  const val = counts(apis.base, profile, "validation");
  out[profile.id] = { noise_mainDev_vs_mainVal: +(js(val) - js(dev)).toFixed(5) };
  if (profile.id === "monosyllables-bare") {
    const head = counts(apis.head, profile, "development");
    const fam: Record<string, number> = {};
    for (const k of new Set([...dev.keys(), ...head.keys(), ...R.keys()])) {
      const r = R.get(k) ?? 0, d = c(head.get(k) ?? 0, r) - c(dev.get(k) ?? 0, r);
      const name = families.find(([, re]) => re.test(k))?.[0] ?? "everything else";
      fam[name] = (fam[name] ?? 0) + d;
    }
    out[profile.id].families = Object.fromEntries(Object.entries(fam).map(([k, v]) => [k, +v.toFixed(5)]));
    out[profile.id].total = +(js(head) - js(dev)).toFixed(5);
  }
  console.error(profile.id, JSON.stringify(out[profile.id]));
}
console.log(JSON.stringify(out, null, 1));
