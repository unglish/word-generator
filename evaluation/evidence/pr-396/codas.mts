// Monosyllable coda distribution: generator (harness monosyllables-bare streams,
// development + validation seeds) vs CMU single-vowel words (types).
// usage: tsx codas.mts <generatorRoot> <harnessRoot> <cmudict.dict>
import { readFileSync } from "node:fs";
const [root, harness, dictPath] = process.argv.slice(2);
const norm = JSON.parse(readFileSync(`${harness}/data/cmu/phoneme-normalization.json`, "utf8"));
const protocol = JSON.parse(readFileSync(`${harness}/evaluation/quality/protocol.json`, "utf8"));
const VOWELS = new Set("AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW".split(" "));
const alias = (p: string) => { const s = p.replace(/ʰ/g, ""); return norm.generatedAliases[s] ?? s; };

// CMU: first unlabelled pronunciation of each a-z word with exactly one vowel.
const cmu = new Map<string, { n: number; ex: string[] }>();
const cmuNuc = new Map<string, number>();
const seen = new Set<string>();
let cmuWords = 0;
for (const line of readFileSync(dictPath, "utf8").split("\n")) {
  const [head, ...rest] = line.split("#")[0].trim().split(/\s+/);
  if (!head || /\(\d+\)$/.test(head) || !/^[a-z]+$/.test(head) || seen.has(head)) continue;
  seen.add(head);
  const phones = rest.map(p => p.replace(/\d$/, ""));
  const v = phones.map((p, i) => VOWELS.has(p) ? i : -1).filter(i => i >= 0);
  if (v.length !== 1) continue;
  cmuWords++;
  const coda = phones.slice(v[0] + 1).map(p => norm.arpabetToIpa[p]).join(" ");
  const nucCoda = norm.arpabetToIpa[phones[v[0]]] + " | " + coda;
  const e = cmu.get(coda) ?? { n: 0, ex: [] }; e.n++; if (e.ex.length < 4) e.ex.push(head); cmu.set(coda, e);
  cmuNuc.set(nucCoda, (cmuNuc.get(nucCoda) ?? 0) + 1);
}

const api = await import(`${root}/src/index.ts`);
const profile = protocol.profiles.find((p: any) => p.id === "monosyllables-bare");
const gen = new Map<string, { n: number; ex: string[] }>();
const genNuc = new Map<string, number>();
let genWords = 0;
for (const seed of [...profile.seeds.development, ...profile.seeds.validation]) {
  const rand = api.createSeededRng(seed);
  const options = process.env.UNFORCED ? { mode: "lexicon", morphology: false } : profile.options;
  for (let i = 0; i < protocol.wordsPerReplicate; i++) {
    let w = api.generateWord({ ...options, rand });
    while (w.syllables.length !== 1) w = api.generateWord({ ...options, rand });
    const syl = w.syllables[0];
    const coda = syl.coda.map((p: any) => alias(p.sound)).join(" ");
    const nuc = syl.nucleus.map((p: any) => alias(p.sound)).join(" ");
    genWords++;
    const e = gen.get(coda) ?? { n: 0, ex: [] }; e.n++; if (e.ex.length < 4) e.ex.push(w.written.clean); gen.set(coda, e);
    genNuc.set(nuc + " | " + coda, (genNuc.get(nuc + " | " + coda) ?? 0) + 1);
  }
}

const share = (m: Map<string, { n: number }>, total: number, k: string) => (m.get(k)?.n ?? 0) / total;
const keys = new Set([...cmu.keys(), ...gen.keys()]);
const rows = [...keys].map(k => {
  const g = share(gen, genWords, k), c = share(cmu, cmuWords, k);
  return { coda: k || "(open)", len: k ? k.split(" ").length : 0, gen: g, cmu: c, excess: g - c, ratio: c ? g / c : Infinity,
    genEx: gen.get(k)?.ex ?? [], cmuEx: cmu.get(k)?.ex ?? [] };
});
// JS divergence of coda distributions, and per-coda contribution.
const contrib = (p: number, q: number) => { const m = p + q; let x = 0; if (p) x += p * (1 + Math.log2(p) - Math.log2(m)); if (q) x += q * (1 + Math.log2(q) - Math.log2(m)); return x / 2; };
let js = 0; for (const r of rows) { (r as any).js = contrib(r.gen, r.cmu); js += (r as any).js; }

const byLen: Record<number, { gen: number; cmu: number }> = {};
for (const r of rows) { const b = byLen[r.len] ??= { gen: 0, cmu: 0 }; b.gen += r.gen; b.cmu += r.cmu; }
const pct = (x: number) => (100 * x).toFixed(2) + "%";
console.log(`generator monosyllables: ${genWords}; CMU single-vowel words: ${cmuWords}; coda JS bits: ${js.toFixed(4)}`);
console.log(`distinct codas: generator ${gen.size}, CMU ${cmu.size}`);
console.log("\ncoda length   generator   CMU");
for (const [l, b] of Object.entries(byLen)) console.log(`  ${l}           ${pct(b.gen).padStart(7)}   ${pct(b.cmu).padStart(7)}`);
const fmt = (r: any) => `${r.coda.padEnd(10)} gen ${pct(r.gen).padStart(7)}  cmu ${pct(r.cmu).padStart(7)}  x${Number.isFinite(r.ratio) ? r.ratio.toFixed(1) : "∞"}  js ${r.js.toFixed(4)}  gen: ${r.genEx.join(",")}  cmu: ${r.cmuEx.join(",")}`;
console.log("\nTop 25 overproduced codas (by excess share):");
for (const r of rows.filter(r => r.excess > 0).sort((a, b) => b.excess - a.excess).slice(0, 25)) console.log("  " + fmt(r));
console.log("\nTop 15 underproduced codas:");
for (const r of rows.filter(r => r.excess < 0).sort((a, b) => a.excess - b.excess).slice(0, 15)) console.log("  " + fmt(r));
console.log("\nCodas the generator makes that CMU monosyllables never have (top 20 by share):");
for (const r of rows.filter(r => r.cmu === 0).sort((a, b) => b.gen - a.gen).slice(0, 20)) console.log("  " + fmt(r));
const totalNever = rows.filter(r => r.cmu === 0).reduce((s, r) => s + r.gen, 0);
console.log(`  total generator share in codas absent from CMU monosyllables: ${pct(totalNever)}`);
const watch = ["n tʃ t", "ŋ θ", "n t s", "k s t", "k t s", "k s t s", "ŋ k θ", "l f θ", "m p s", "n tʃ"];
console.log("\nWatched codas:");
for (const k of watch) { const r = rows.find(r => r.coda === k); if (r) console.log("  " + fmt(r)); }
const ɚ = (m: Map<string, number>, t: number, k: string) => (m.get(k) ?? 0) / t;
console.log("\n/ɜ/ (ɚ) + coda:");
for (const k of ["ɜ | n t s", "ɜ | n tʃ", "ɜ | m p s", "ɜ | n t", "ɜ | r", "ɜ | "]) console.log(`  ${k.padEnd(12)} gen ${pct(ɚ(genNuc, genWords, k))}  cmu ${pct(ɚ(cmuNuc, cmuWords, k))}`);
