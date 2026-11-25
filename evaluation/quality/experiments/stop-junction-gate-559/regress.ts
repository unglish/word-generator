import { createSeededRng, createGenerator, englishConfig } from "../../../../src/index.ts";
import { ipaToArpabet } from "../../../../src/phonotactic/ipa-to-arpabet.ts";
import { syllabify } from "../../../../evaluation/review/wordlikeness/model.ts";
import { readFileSync } from "node:fs";
const cmu = JSON.parse(readFileSync("../../../../evaluation/review/wordlikeness/artifacts/reference-v1.json", "utf8"));
const cmuOnsets = new Set<string>(cmu.model.initial_onsets);
const ref = [
  { words: 11622, hits: {} as Record<string, number> },
  { words: 15644, hits: { "M|T": 4, "T|P": 9, "D|G": 3, "M|D": 3, "N|P": 15, "T|K": 14, "N|K": 32, "N|G": 9, "NG|K": 97, "NG|G": 101 } as Record<string, number> },
  { words: 9152, hits: { "M|T": 4, "T|P": 3, "M|D": 1, "N|P": 9, "T|K": 4, "N|K": 36, "N|G": 6, "NG|K": 31, "NG|G": 42 } as Record<string, number> },
  { words: 4450, hits: { "N|P": 3, "N|K": 39, "N|G": 1, "NG|K": 13, "NG|G": 9 } as Record<string, number> },
  { words: 1802, hits: { "N|P": 1, "N|K": 17, "N|G": 2, "NG|K": 7 } as Record<string, number> },
];
const pairs = Object.keys(ref[1].hits);
const bw = { ...englishConfig.clusterWeights!.boundary! } as Record<string, unknown>;
for (const k of (process.env.DROP ?? "").split(",").filter(Boolean)) delete bw[k];
const gen = createGenerator({ ...englishConfig, clusterWeights: { ...englishConfig.clusterWeights, boundary: process.env.DROP === "all" ? undefined : bw as never } });
const n = Number(process.env.N ?? 40000);
for (const seed of process.argv.slice(2).map(Number)) {
  const rand = createSeededRng(seed);
  const observed: Record<string, number> = {};
  const lengths = ref.map(() => 0);
  for (let i = 0; i < n; i++) {
    const { lexical } = gen.generateWord({ mode: "lexicon", rand, trace: true });
    const tokens = lexical!.root.flatMap(({ onset, nucleus, coda }) => [
      ...onset.map((p) => ipaToArpabet(p.sound)!),
      ...nucleus.map((p) => ipaToArpabet(p.sound)! + "0"),
      ...coda.map((p) => ipaToArpabet(p.sound)!),
    ]);
    const parsed = syllabify(tokens, cmuOnsets);
    lengths[Math.min(parsed.length, lengths.length) - 1]++;
    const joins = new Set<string>();
    for (let j = 1; j < parsed.length; j++) {
      const { coda } = parsed[j - 1]; const { onset } = parsed[j];
      if (coda.length === 1 && onset.length === 1) joins.add(coda[0] + "|" + onset[0]);
    }
    for (const p of joins) if (pairs.includes(p)) observed[p] = (observed[p] ?? 0) + 1;
  }
  const expected = Object.fromEntries(pairs.map((p) => [p, ref.reduce((s, { words, hits }, k) => s + lengths[k] * (hits[p] ?? 0) / words, 0)]));
  console.log(JSON.stringify({ seed, observed, expected, lengths }));
}
