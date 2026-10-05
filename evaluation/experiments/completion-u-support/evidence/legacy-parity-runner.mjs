import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const control = '/private/tmp/q14a-closure-audit-v1/committed';
const candidate = '/private/tmp/q14a-completion-u-support-v1';
const output = '/private/tmp/q14a-completion-u-support-evidence-v1/legacy-parity-renewed.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function sourcePins(root) {
  const pins = {};
  async function walk(directory) {
    for (const entry of (await readdir(join(root, directory), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) pins[path] = hash(await readFile(join(root, path)));
    }
  }
  await walk('src');
  for (const path of ['package.json', 'package-lock.json', 'tsconfig.json']) pins[path] = hash(await readFile(join(root, path)));
  return pins;
}
const protocolBytes = await readFile(join(candidate, 'evaluation/quality/protocol.json'));
const protocol = JSON.parse(protocolBytes);
const registrationBytes = await readFile(join(candidate, 'evaluation/experiments/split-digraphs/registration-files.json'));
const materialization = JSON.parse(await readFile('/private/tmp/q14a-completion-u-support-evidence-v1/control-materialization.json'));
const before = { control: await sourcePins(control), candidate: await sourcePins(candidate) };
for (const [path, pin] of Object.entries(materialization.files)) {
  if (before.control[path] !== pin.sha256) throw new Error(`Control blob mismatch: ${path}`);
}
const authority = {
  node: process.version, nodePath: process.execPath, nodeSha256: hash(await readFile(process.execPath)),
  runnerSha256: hash(await readFile(new URL(import.meta.url))), protocolSha256: hash(protocolBytes),
  registrationSha256: hash(registrationBytes), controlCommit: materialization.revision,
  sources: before,
};
await writeFile('/private/tmp/q14a-completion-u-support-evidence-v1/legacy-parity-authority-renewed.json', JSON.stringify(authority, null, 2) + '\n', { flag: 'wx' });
const oldAPI = await import(pathToFileURL(join(control, 'src/index.ts')).href);
const newAPI = await import(pathToFileURL(join(candidate, 'src/index.ts')).href);
let generationCalls = 0;
let coordinates = 0;
let cursor;
const results = [];
function equal(actual, expected, label) {
  if (!isDeepStrictEqual(actual, expected)) throw new Error(`Parity mismatch: ${label} at ${JSON.stringify(cursor)}`);
}
function instrument(api, seed) {
  const rng = api.createSeededRng(seed);
  let count = 0;
  return { rand: () => { count++; return rng(); }, count: () => count, next: () => rng() };
}
function factory(api, override) {
  const config = { ...api.englishConfig, splitVowels: undefined };
  if (override.kind === 'probabilities') config.spellingRules = config.spellingRules.map((rule, i) => ({ ...rule, probability: i % 2 ? 100 : 0 }));
  if (override.kind === 'reverse-order') config.spellingRules = [...config.spellingRules].reverse();
  if (override.kind === 'disabled-doubling') config.doubling = { ...config.doubling, enabled: false };
  return api.createGenerator(config);
}
function runStream(id, seed, options, count, override = {}) {
  const variants = [
    { api: oldAPI, trace: false }, { api: oldAPI, trace: true },
    { api: newAPI, trace: false }, { api: newAPI, trace: true },
  ].map(v => ({ ...v, generator: factory(v.api, override), rng: instrument(v.api, seed), digest: createHash('sha256') }));
  for (let drawIndex = 0; drawIndex < count; drawIndex++) {
    cursor = { id, seed, drawIndex };
    const words = variants.map(v => {
      const word = structuredClone(v.generator.generateWord({ ...options, trace: v.trace, rand: v.rng.rand }));
      generationCalls++;
      v.digest.update(JSON.stringify(word) + '\n');
      return word;
    });
    equal(words[2], words[0], 'complete untraced word');
    equal(words[3], words[1], 'complete traced word');
    for (const [plain, traced] of [[words[0], words[1]], [words[2], words[3]]]) {
      equal(Object.hasOwn(plain, 'trace'), false, 'untraced property absent');
      equal(Object.hasOwn(traced, 'trace'), true, 'traced property present');
      const withoutTrace = { ...traced };
      delete withoutTrace.trace;
      equal(withoutTrace, plain, 'complete trace-on/off values');
    }
    equal(variants.map(v => v.rng.count()), Array(4).fill(variants[0].rng.count()), 'RNG cumulative calls');
    coordinates++;
  }
  const nextValues = variants.map(v => v.rng.next());
  equal(nextValues, Array(4).fill(nextValues[0]), 'next RNG values');
  results.push({ id, seed, coordinates: count, rngCallsPerVariant: variants[0].rng.count(), nextValues,
    wordDigests: variants.map(v => v.digest.digest('hex')) });
  console.log(id, seed, count, generationCalls);
}
try {
  for (const profile of protocol.profiles) {
    for (const seed of profile.seeds.development) runStream(profile.id, seed, profile.options, 1000);
  }
  equal(coordinates, 20000, 'registered coordinate count');
  for (const [id, override] of [
    ['custom-probabilities', { kind: 'probabilities' }],
    ['reverse-rule-order', { kind: 'reverse-order' }],
    ['disabled-doubling', { kind: 'disabled-doubling' }],
  ]) {
    for (const seed of [7, 1214, 6123, 8675309]) runStream(id, seed, { mode: 'lexicon', morphology: false }, 64, override);
  }
  equal(await sourcePins(control), before.control, 'control source closure');
  equal(await sourcePins(candidate), before.candidate, 'candidate source closure');
  equal(hash(await readFile(join(candidate, 'evaluation/quality/protocol.json'))), authority.protocolSha256, 'protocol');
  equal(hash(await readFile(join(candidate, 'evaluation/experiments/split-digraphs/registration-files.json'))), authority.registrationSha256, 'registration');
  equal(hash(await readFile(process.execPath)), authority.nodeSha256, 'engine');
  await writeFile(output, JSON.stringify({ version: 'q14a-legacy-parity-v1', passed: true, generationCalls, coordinates,
    registeredCoordinates: 20000, customCoordinates: coordinates - 20000, nextValueProbes: results.length * 4,
    authoritySha256: hash(await readFile('/private/tmp/q14a-completion-u-support-evidence-v1/legacy-parity-authority-renewed.json')), results,
    scope: 'Public configured generateWord; snapshots taken immediately to compare values, not cross-call alias ownership. No candidate active-policy quality conclusion.' }, null, 2) + '\n', { flag: 'wx' });
  console.log('PASS', coordinates, generationCalls);
} catch (error) {
  await writeFile('/private/tmp/q14a-completion-u-support-evidence-v1/legacy-parity-failure-renewed.json', JSON.stringify({ cursor, generationCalls, coordinates, completedStreams: results, error: String(error) }, null, 2) + '\n', { flag: 'wx' });
  throw error;
}
