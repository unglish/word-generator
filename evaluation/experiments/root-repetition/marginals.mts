import fs from "node:fs";
import { resolve } from "node:path";
const root = process.cwd();
const load = (path: string) => import(resolve(root, path));
const read = (path: string) => JSON.parse(fs.readFileSync(path, "utf8"));
const { createGenerator, createSeededRng, englishConfig } = await load("src/index.ts");
const { computePhonemeQualityMetrics } = await load("src/core/phoneme-quality.ts");
const { distributionDistance } = await load("evaluation/quality/distribution.ts");
const { normalizeGeneratedPhoneme } = await load("src/core/phoneme-normalization.ts");
const normalization = read("data/cmu/phoneme-normalization.json");
const cmu = read("data/cmu/cmu-lexicon-phonemes.json");
const stages = read("evaluation/corpus/stage-references.json");
const protocol = read("evaluation/quality/protocol.json");
const tune = process.env.REPETITION_CONFIG ? JSON.parse(process.env.REPETITION_CONFIG) : englishConfig.rootRepetition;
const generator = createGenerator({ ...englishConfig, rootRepetition: tune });
const add = (counts: Record<string, number>, key: string) => counts[key] = (counts[key] ?? 0) + 1;
const rows = protocol.profiles
  .filter((profile: any) => !process.env.PROFILE || profile.id === process.env.PROFILE)
  .map(({ id, options, seeds }: any) => {
  const phonemes: Record<string, number> = {};
  const rimes: Record<string, number> = {};
  for (const seed of seeds.development) {
    const rand = createSeededRng(seed);
    for (let i = 0; i < Number(process.env.COUNT ?? 10000); i++) {
      const word = generator.generateWord({ ...options, rand });
      const root = word.lexical.root;
      const surface = word.syllables.slice(word.lexical.rootSyllableStart, word.lexical.rootSyllableStart + root.length);
      const hits = new Set<string>();
      for (const [index, { onset, nucleus, coda }] of surface.entries()) {
        const vowel = nucleus[0].sound;
        if (onset.at(-1)?.sound === "r" && (["ɚ", "ɝ"].includes(vowel) || coda.some(p => p.sound === "r"))) hits.add("rhoticOnset");
        if (coda[0]?.sound === "r" && ["i:", "u", "eɪ", "əʊ", "aɪ", "aʊ", "ɔɪ"].includes(vowel)) hits.add("tenseR");
        if (coda[0]?.sound === "r" && ["ə", "ʌ"].includes(vowel)) hits.add("reducedR");
        if (["ɚ", "ɝ"].includes(vowel) && index === root.length - 1 && coda[0]?.sound === "l") hits.add("finalRhoticL");
      }
      for (const hit of hits) add(rimes, hit);
      for (const { onset, nucleus, coda } of word.syllables) {
        for (const phone of [...onset, ...nucleus, ...coda]) add(phonemes, normalizeGeneratedPhoneme(phone.sound, normalization));
      }
    }
  }
  const { totalVariationPct, topAbsoluteGap } = computePhonemeQualityMetrics(phonemes, id === "lexicon-bare" ? stages.roots.phonemes : cmu, 0.5);
  const { jensenShannonBits } = distributionDistance(phonemes, cmu);
  return { id, jensenShannonBits, totalVariationPct, rimes, topAbsoluteGap };
});
console.log(JSON.stringify({ tune, rows }, null, 2));
