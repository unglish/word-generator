import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { createGzip } from 'node:zlib';
import * as control from '/private/tmp/q02-stream-acceptance-revalidation-v1/control-checkout/src/index.ts';
import * as candidate from '/private/tmp/q02-stream-acceptance-revalidation-v1/candidate-checkout/src/index.ts';

const root = '/private/tmp/q02-corpus-acceptance-revalidation-v1';
const sha = data => createHash('sha256').update(data).digest('hex');
const registrationBytes = await readFile(`${root}/trace-parity-registration.json`);
const registration = JSON.parse(registrationBytes);
const measurementBytes = await readFile(`${root}/measurement.json`);
const measurement = JSON.parse(measurementBytes);
const protocolBytes = await readFile(`${root}/protocol.json`);
const protocol = JSON.parse(protocolBytes);
assert.equal(sha(measurementBytes), registration.measurementSha256);
assert.equal(sha(protocolBytes), registration.protocolSha256);
assert.equal(sha(await readFile(new URL(import.meta.url))), registration.runnerSha256);
const sourceBinding = JSON.parse(await readFile(`${root}/source-binding.json`));
async function checkSources() {
  for (const [role, files] of Object.entries(sourceBinding.sourcePins)) {
    for (const file of files) {
      const data = await readFile(`${sourceBinding[`${role}Source`]}/${file.path}`);
      assert.equal(data.length, file.bytes);
      assert.equal(sha(data), file.sha256);
    }
  }
}
const traceAdditions = [
  'finalWord', 'writerInput', 'writerOutput', 'gapSpellingPass', 'morphologyPass',
  'pronunciationPasses', 'morphologyPreparation', 'morphologyWriting', 'finalNucleus',
];
const realizationAdditions = [
  'rootEdits', 'finalSpelling', 'phoneAssembly', 'finalPhones', 'selectionPhones', 'configurationIndices',
];
function legacyWord(word) {
  const result = structuredClone(word);
  if (result.trace) {
    for (const field of traceAdditions) delete result.trace[field];
    if (result.trace.morphology?.realization) {
      for (const field of realizationAdditions) delete result.trace.morphology.realization[field];
    }
  }
  return result;
}
function withoutTrace(word) {
  const result = structuredClone(word);
  delete result.trace;
  return result;
}
function state(api, generator, seed, trace) {
  const rng = api.createSeededRng(seed);
  let draws = 0;
  return {
    word(options) {
      return generator.generateWord({ ...options, trace, rand: () => { draws++; return rng(); } });
    },
    draws() { return draws; },
    next() { return rng(); },
  };
}
await checkSources();
const target = `${root}/trace-parity-full-records.jsonl.gz`;
const output = createWriteStream(target, { flags: 'wx' });
const gzip = createGzip({ level: 9 });
gzip.pipe(output);
const rawDigest = createHash('sha256');
const strata = [];
let coordinates = 0;
let publicCalls = 0;
let withinArmTraceComparisons = 0;
let acrossArmComparisons = 0;
let nextRngProbes = 0;
for (const active of [false, true]) {
  function configured(api) {
    return api.createGenerator({ ...api.englishConfig, ...(active ? {
      splitVowels: measurement.configuration.splitVowels,
      followingLetters: measurement.configuration.followingLetters,
    } : {}) });
  }
  const generators = { control: configured(control), candidate: configured(candidate) };
  for (const profile of protocol.profiles) {
    for (const seed of profile.seeds.development) {
      const states = {
        controlOff: state(control, generators.control, seed, false),
        controlOn: state(control, generators.control, seed, true),
        candidateOff: state(candidate, generators.candidate, seed, false),
        candidateOn: state(candidate, generators.candidate, seed, true),
      };
      const wordHashes = Object.fromEntries(Object.keys(states).map(key => [key, createHash('sha256')]));
      for (let drawIndex = 0; drawIndex < registration.wordsPerStream; drawIndex++) {
        const words = Object.fromEntries(Object.entries(states).map(([key, stream]) => [key, stream.word(profile.options)]));
        const draws = Object.fromEntries(Object.entries(states).map(([key, stream]) => [key, stream.draws()]));
        assert.deepEqual(withoutTrace(words.controlOn), words.controlOff);
        assert.deepEqual(withoutTrace(words.candidateOn), words.candidateOff);
        assert.deepEqual(words.candidateOff, words.controlOff);
        assert.deepEqual(legacyWord(words.candidateOn), words.controlOn);
        assert.equal(words.controlOn.trace?.finalWord, undefined);
        assert(words.candidateOn.trace?.finalWord);
        for (const count of Object.values(draws)) assert.equal(count, draws.controlOff);
        for (const [key, word] of Object.entries(words)) wordHashes[key].update(`${JSON.stringify(word)}\n`);
        const line = `${JSON.stringify({ active, profile: profile.id, seed, drawIndex, draws, words })}\n`;
        rawDigest.update(line);
        if (!gzip.write(line)) await once(gzip, 'drain');
        coordinates++;
        publicCalls += 4;
        withinArmTraceComparisons += 2;
        acrossArmComparisons += 2;
      }
      const next = Object.fromEntries(Object.entries(states).map(([key, stream]) => [key, stream.next()]));
      for (const value of Object.values(next)) assert.equal(value, next.controlOff);
      nextRngProbes += 4;
      const summary = {
        active, profile: profile.id, seed, wordsEach: registration.wordsPerStream,
        drawsEach: states.controlOff.draws(), nextValues: next,
        completeWordHashes: Object.fromEntries(Object.entries(wordHashes).map(([key, digest]) => [key, digest.digest('hex')])),
      };
      strata.push(summary);
      console.log(JSON.stringify(summary));
    }
  }
}
gzip.end();
await once(output, 'finish');
await checkSources();
assert.equal(coordinates, 20000);
assert.equal(publicCalls, 80000);
assert.equal(nextRngProbes, 160);
await writeFile(`${root}/trace-parity-complete.json`, `${JSON.stringify({
  terminal: true, passed: true, coordinates, publicCalls, withinArmTraceComparisons,
  acrossArmComparisons, nextRngProbes, strata, rawRecordSha256: rawDigest.digest('hex'),
  registrationSha256: sha(registrationBytes), runnerSha256: registration.runnerSha256,
  scope: 'Full original twenty-stream/first500 schedule under default and active policies, extended to both trace modes on both exact formal sources. All four full public Words and cumulative RNG counts retained per coordinate. Only the original archive-comparer additions are removed for cross-arm legacy traces; within-arm complete Words differ only by trace. Not a full200000-coordinate RNG certificate or naturalness result.',
}, null, 2)}\n`, { flag: 'wx' });
