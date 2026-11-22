import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const { generateWord } = await import(pathToFileURL(resolve("src/index.ts")).href);
const result = {};
for (const mode of ['lexicon', 'text']) {
  const counts = { syllables: {}, templates: {}, affixes: {}, finalSibilants: {}, finalCodas: {}, sibilantSuffixed: 0, syllableSum: 0, rootSyllableSum: 0, attempts: 0, fallbacks: 0 };
  const incr = (table, key) => { table[key] = (table[key] ?? 0) + 1; };
  for (let seed = 3000000; seed < 3020000; seed++) {
    const word = generateWord({ mode, seed, trace: true });
    const root = word.trace.stages.find(stage => stage.name === 'repairNucleusWordPositions').after;
    const morphology = word.trace.morphology;
    const coda = root.at(-1).coda;
    incr(counts.syllables, Math.min(word.syllables.length, 5));
    incr(counts.templates, morphology.template);
    incr(counts.finalCodas, coda.join(' '));
    if (morphology.prefix) incr(counts.affixes, `${morphology.prefix}-`);
    if (morphology.suffix) incr(counts.affixes, `-${morphology.suffix}`);
    if (coda.length > 1 && /^(s|z)$/.test(coda.at(-1))) {
      incr(counts.finalSibilants, coda.join(' '));
      if (morphology.suffix) counts.sibilantSuffixed++;
    }
    counts.syllableSum += word.syllables.length;
    counts.rootSyllableSum += root.length;
    counts.attempts += word.trace.attempts + 1;
    if (word.trace.selection.status === 'fallback') counts.fallbacks++;
  }
  result[mode] = counts;
}
console.log(JSON.stringify(result, null, 2));
