// Trigram JS (bits) vs CMU per quality cohort, for config ablations. Mirrors evaluation/quality/capture.ts draws.
import { readFileSync } from "node:fs";
const S = "<scratch>";
const cand = await import(`${S}/w470/src/index.ts`);
const { buildGraphemeMaps } = await import(`${S}/w470/src/elements/graphemes/index.ts`);
const stack = await import(`${S}/runs/p470/stackbase/src/index.ts`);
const protocol = JSON.parse(readFileSync(`${S}/w470/evaluation/quality/protocol.json`, "utf8"));
const ref = JSON.parse(readFileSync(`${S}/w470/data/cmu/cmu-lexicon-trigrams.json`, "utf8"));
const norm = (o: Record<string, number>) => { const t = Object.values(o).reduce((a, b) => a + b, 0); return new Map(Object.entries(o).map(([k, v]) => [k, v / t])); };
const R = norm(ref);
function js(g: Record<string, number>) {
  const G = norm(g); let s = 0;
  for (const k of new Set([...G.keys(), ...R.keys()])) { const p = G.get(k) ?? 0, q = R.get(k) ?? 0, m = p + q;
    if (p > 0) s += p * Math.log2(2 * p / m) / 2; if (q > 0) s += q * Math.log2(2 * q / m) / 2; }
  return s;
}
const c = cand.englishConfig;
const strip = (gs: any[]) => gs.map((g: any) => { if (!g.condition?.openReading) return g; const { openReading, ...rest } = g.condition; return { ...g, condition: rest }; });
const { codaLimit, ...silentNoLimit } = c.silentE;
const variants: Record<string, any> = {
  stack: stack.createGenerator(stack.englishConfig),
  candidate: cand.createGenerator(c),
  "no codaLimit": cand.createGenerator({ ...c, silentE: silentNoLimit }),
  "no hard-c": cand.createGenerator({ ...c, spellingRules: c.spellingRules.filter((r: any) => r.name !== "ie-ue-hard-c-to-k") }),
};
const which = process.argv.slice(2);
for (const [name, gen] of Object.entries(variants)) {
  if (which.length && !which.includes(name)) continue;
  const row: string[] = [];
  for (const profile of protocol.profiles) {
    const counts: Record<string, number> = {};
    for (const seed of profile.seeds.development) {
      const rand = (name === "stack" ? stack : cand).createSeededRng(seed);
      for (let i = 0; i < protocol.wordsPerReplicate; i++) {
        const w = gen.generateWord({ ...profile.options, rand });
        const sp = w.written.clean.toLowerCase();
        for (let j = 0; j + 2 < sp.length; j++) { const t = sp.slice(j, j + 3); if (/^[a-z]{3}$/.test(t)) counts[t] = (counts[t] ?? 0) + 1; }
      }
    }
    row.push(`${profile.id} ${js(counts).toFixed(6)}`);
  }
  console.log(name.padEnd(14), row.join("  "));
}
