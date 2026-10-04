import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { createGunzip, createGzip } from 'node:zlib';
import * as api from '/private/tmp/q02-trace-history-performance-v2/candidate/src/index.ts';
import { canonical } from '/private/tmp/q02-trace-history-performance-v2/baseline/evaluation/quality/serialization.ts';

const root = '/private/tmp/q02-trace-history-performance-v2';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const registrationBytes = await readFile(`${root}/archive-registration.json`);
const registration = JSON.parse(registrationBytes);
assert.equal(sha(await readFile(new URL(import.meta.url))), registration.runnerSha256);
const freeze = JSON.parse(await readFile(`${root}/source-freeze.json`));
async function stable() {
  assert.equal(sha(await readFile(`${root}/source-freeze.json`)), registration.sourceFreezeSha256);
  for (const [role, pins] of Object.entries(freeze)) for (const pin of pins) {
    const bytes = await readFile(`${root}/${role}/${pin.path}`);
    assert.equal(bytes.length, pin.bytes);
    assert.equal(sha(bytes), pin.sha256);
  }
  for (const pin of registration.contextPins) {
    const bytes = await readFile(pin.path);
    assert.equal(bytes.length, pin.bytes);
    assert.equal(sha(bytes), pin.sha256);
  }
}
await stable();
const manifestBytes = await readFile(`${registration.archive}/manifest.json`);
assert.equal(sha(manifestBytes), registration.manifestSha256);
const manifest = JSON.parse(manifestBytes).manifest;
assert.equal(manifest.generator.commit, '7e34a17f31d44d1e31420f458bf6e2d99c5fa038');
const measurementBytes = await readFile(`${root}/measurement.json`);
const protocolBytes = await readFile(`${root}/protocol.json`);
assert.equal(sha(measurementBytes), registration.measurementSha256);
assert.equal(sha(protocolBytes), registration.protocolSha256);
const measurement = JSON.parse(measurementBytes);
const protocol = JSON.parse(protocolBytes);
assert.deepEqual(protocol, manifest.protocol);
assert.equal(protocol.wordsPerReplicate, 10000);
assert.equal(protocol.profiles.length, 4);
const config = structuredClone({ ...api.englishConfig, splitVowels: measurement.configuration.splitVowels,
  followingLetters: measurement.configuration.followingLetters });
assert.deepEqual(canonical(config), manifest.generator.effectiveConfig);
const generator = api.createGenerator(config);
const target = `${root}/active-archive`;
await mkdir(`${target}/words`, { recursive: true });
const strata = [];
let publicWords = 0;
for (const profile of protocol.profiles) for (const seed of profile.seeds.development) {
  assert.equal(profile.seeds.development.length, 5);
  const relative = `words/${profile.id}-${seed}.jsonl.gz`;
  const artifacts = manifest.artifacts.filter(item => item.file === relative);
  assert.equal(artifacts.length, 1);
  const originalHash = createHash('sha256');
  let originalBytes = 0;
  const original = createReadStream(`${registration.archive}/${relative}`);
  original.on('data', bytes => { originalHash.update(bytes); originalBytes += bytes.length; });
  const reader = createInterface({ input: original.pipe(createGunzip()), crlfDelay: Infinity });
  const output = createWriteStream(`${target}/${relative}`, { flags: 'wx' });
  const gzip = createGzip({ level: 9 });
  gzip.pipe(output);
  const rawDigest = createHash('sha256');
  const rand = api.createSeededRng(seed);
  let drawIndex = 0;
  for await (const line of reader) {
    const recorded = JSON.parse(line);
    assert.equal(recorded.profile, profile.id);
    assert.equal(recorded.seed, seed);
    assert.equal(recorded.drawIndex, drawIndex);
    const word = generator.generateWord({ ...profile.options, rand, trace: true });
    const produced = JSON.stringify({ profile: profile.id, seed, drawIndex, word });
    assert.equal(produced, line, `Complete Word/trace mismatch ${profile.id}/${seed}/${drawIndex}`);
    assert(word.trace?.finalWord);
    assert.equal(word.trace.baseSpelling.version, 5);
    const row = `${produced}\n`;
    rawDigest.update(row);
    if (!gzip.write(row)) await once(gzip, 'drain');
    drawIndex++;
    publicWords++;
    if (drawIndex % 1000 === 0) console.log(JSON.stringify({ profile: profile.id, seed, drawIndex, publicWords }));
  }
  assert.equal(originalBytes, artifacts[0].bytes);
  assert.equal(originalHash.digest('hex'), artifacts[0].sha256);
  assert.equal(drawIndex, protocol.wordsPerReplicate);
  gzip.end();
  await once(output, 'finish');
  const storedBytes = await readFile(`${target}/${relative}`);
  strata.push({ profile: profile.id, seed, words: drawIndex, output: relative,
    outputBytes: storedBytes.length, outputSha256: sha(storedBytes), rawSha256: rawDigest.digest('hex'),
    originalArchiveArtifact: artifacts[0], completeWordAndTraceBytesEqual: true });
  await stable();
}
assert.equal(strata.length, 20);
assert.equal(publicWords, 200000);
await stable();
await writeFile(`${root}/active-archive-complete.json`, `${JSON.stringify({
  terminal: true, passed: true, publicWords, strata, originalManifestSha256: registration.manifestSha256,
  registrationSha256: sha(registrationBytes), sourceFreezeSha256: registration.sourceFreezeSha256,
  allOriginalCompressedInputsAuthenticated: true, everyCompletePublicWordAndTraceByteIdentical: true,
  canonicalConfigurationExactlyMatchesOriginal: true,
  scope: 'All20originalactivepolicyshards/200000publicWords regeneratedatnewcandidateeffective source andfullybyte-compared tooriginalQ02candidatearchive. Current source/config bindings separate fromhistoricalmanifest. Allnewactualfulloutputs retained; no source relabeling, field projection, altered seed/sample/heap or speed/qualitygain claim.',
}, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ terminal: true, passed: true, publicWords, completeByteEquality: true }));
