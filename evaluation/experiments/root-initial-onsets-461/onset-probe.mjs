import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [source, ...args] = process.argv.slice(2);
const seeds = args.length ? args.map(Number) : [20261124, 26410157];
const sampleSize = Number(process.env.ONSET_PROBE_WORDS ?? 20000);
const guardSize = Number(process.env.ONSET_PROBE_GUARDS ?? 2000);
const {
  createGenerator, createSeededRng, englishConfig, generateWord, generateWords,
} = await import(pathToFileURL(resolve(source, "src/index.ts")));

function increment(counts, key, amount = 1) {
  counts[key] = (counts[key] ?? 0) + amount;
}

function stageMetrics() {
  return {
    n: 0, targetMismatch: 0, planBudgetMismatch: 0, vowelInitial: 0,
    fallback: 0, attempts: 0, phonemeRejects: 0, letterRejects: 0,
    hiatusWords: 0, hiatusEvents: 0, medialBoundaryDrops: 0, medialOnsets: 0,
    plannedMedialOnsetLengths: {}, generatedMedialOnsetLengths: {},
    writtenMedialOnsetLengths: {}, plannedOnsets: {}, generatedOnsets: {},
    writtenOnsets: {}, realizedOnsetShortfalls: {}, onsetClusters: {},
    plannedFinalCodas: {}, writtenFinalCodas: {}, budgetShapes: {},
    targetSyllablePhones: {}, writtenSyllablePhones: {}, writtenPhones: {},
    rootSpellingLetters: {}, finishedSyllables: {}, finishedLetters: {},
    finishedPhones: {},
  };
}

function snapshot(word) {
  const t = word.trace;
  const root = word.lexical.root;
  const first = root[0];
  const stages = new Map(t.stages.map(stage => [stage.name, stage]));
  return { t, root, first, proposed: stages.get("generateSyllables").after };
}

function collect(metrics, word, {t, root, first, proposed}) {
  const plan = t.syllablePlans;
  const target = t.targetPhonemeCount;
  const s = t.selection;
  assert.equal(proposed.length, root.length);
  assert.equal(plan.length, root.length);
  assert.equal(t.syllableCount, root.length);

  const actual = root.flatMap(syl => [...syl.onset, ...syl.nucleus, ...syl.coda]);
  const finished = word.syllables.flatMap(syl => [...syl.onset, ...syl.nucleus, ...syl.coda]);
  const planBudget = plan.reduce((sum, p) => sum + p.onsetLength + p.codaLength, root.length);
  const initial = plan[0].onsetLength;
  const final = plan.at(-1).codaLength;
  const events = t.structural;
  const hiatus = events.filter(event => event.event === "vowelHiatusFallback").length;
  const boundaryDrops = events.filter(event => ["boundaryDrop", "risingCodaBoundaryDrop", "sspBoundaryDrop", "junctionBoundaryDrop"].includes(event.event)).length;

  metrics.n++;
  metrics.targetMismatch += Number(actual.length !== target);
  metrics.planBudgetMismatch += Number(planBudget !== target);
  metrics.vowelInitial += Number(/^[aeiou]/.test(t.baseSpelling.surface));
  metrics.fallback += Number(s.status === "fallback");
  metrics.attempts += s.attemptsExecuted;
  metrics.phonemeRejects += s.rejectionReasons.phonemeTarget;
  metrics.letterRejects += s.rejectionReasons.letterLength;
  metrics.hiatusWords += Number(hiatus > 0);
  metrics.hiatusEvents += hiatus;
  metrics.medialBoundaryDrops += boundaryDrops;
  for (let i = 1; i < root.length; i++) {
    metrics.medialOnsets++;
    increment(metrics.plannedMedialOnsetLengths, plan[i].onsetLength);
    increment(metrics.generatedMedialOnsetLengths, proposed[i].onset.length);
    increment(metrics.writtenMedialOnsetLengths, root[i].onset.length);
  }
  increment(metrics.plannedOnsets, initial);
  increment(metrics.generatedOnsets, proposed[0].onset.length);
  increment(metrics.writtenOnsets, first.onset.length);
  increment(metrics.realizedOnsetShortfalls, initial - first.onset.length);
  increment(metrics.onsetClusters, first.onset.map(p => p.sound).join(" "));
  increment(metrics.plannedFinalCodas, final);
  increment(metrics.writtenFinalCodas, root.at(-1).coda.length);
  increment(metrics.budgetShapes, `${root.length},${target},${final},${initial}`);
  increment(metrics.targetSyllablePhones, `${root.length},${target}`);
  increment(metrics.writtenSyllablePhones, `${root.length},${actual.length}`);
  for (const phone of actual) increment(metrics.writtenPhones, phone.sound);
  increment(metrics.rootSpellingLetters, t.baseSpelling.surface.length);
  increment(metrics.finishedSyllables, word.syllables.length);
  increment(metrics.finishedLetters, word.written.clean.length);
  for (const phone of finished) increment(metrics.finishedPhones, phone.sound);
}

function audit(seed) {
  const rand = createSeededRng(seed);
  const all = stageMetrics();
  const byRootSyllables = {};
  for (let i = 0; i < sampleSize; i++) {
    const word = generateWord({ rand, mode: "lexicon", trace: true });
    const observed = snapshot(word);
    const size = observed.root.length;
    byRootSyllables[size] ??= stageMetrics();
    collect(byRootSyllables[size], word, observed);
    collect(all, word, observed);
  }
  return { all, byRootSyllables };
}

function hash(words) {
  const digest = createHash("sha256");
  for (const word of words) {
    digest.update(JSON.stringify(word));
    digest.update("\n");
  }
  return digest.digest("hex");
}

function guards(seed) {
  const onsetConfig = { ...englishConfig.generationWeights.onsetLength };
  delete onsetConfig.rootInitialByMode;
  const custom = createGenerator({
    ...englishConfig,
    generationWeights: { ...englishConfig.generationWeights, onsetLength: onsetConfig },
  });
  const rand = createSeededRng(seed);
  return {
    text: hash(generateWords(guardSize, { seed, mode: "text", trace: true })),
    mono: hash(generateWords(guardSize, { seed, mode: "lexicon", syllableCount: 1, trace: true })),
    omittedOnsetConfig: hash(Array.from({ length: guardSize }, () =>
      custom.generateWord({ rand, mode: "lexicon", trace: true }))),
  };
}

const replicates = {};
for (const seed of seeds) {
  const generated = audit(seed);
  replicates[seed] = { ...generated, guards: guards(seed) };
}
console.log(JSON.stringify({ sampleSize, guardSize, replicates }, null, 2));
