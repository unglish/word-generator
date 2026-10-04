import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream, readFileSync, writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {createGunzip, gunzipSync} from 'node:zlib';
import {englishConfig} from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator/src/index.ts';
import {verifyLexicalSpellingOperations} from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator/src/core/lexical-spelling-evidence.ts';
import {verifyFinalWordSourceLinks} from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator/src/core/final-word-sources.ts';
import {verifyConfiguredAllomorphs} from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator/src/core/morphology/allomorph-evidence.ts';
import {endpointCounts} from './audit/production-endpoints.mjs';

const directory = '/private/tmp/q10b2-witnesses-v1';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const selection = JSON.parse(readFileSync(`${directory}/selection.json`));
assert.equal(selection.passed, true);
assert.equal(selection.words, 400000);
const witnessBytes = readFileSync(`${directory}/witnesses.json.gz`);
const witnesses = JSON.parse(gunzipSync(witnessBytes));
const freeze = JSON.parse(readFileSync('/private/tmp/q10b2-configured-final-vowel-contract-active-v1-freeze/before.json'));
const registration = freeze.registration.registration;
const policyBytes = readFileSync(`/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator/${registration.activePolicyRegistration.path}`);
assert.equal(sha(policyBytes), registration.activePolicyRegistration.sha256);
const active = JSON.parse(policyBytes).configuration;
const groups = new Map();
for (const [key, witness] of Object.entries(witnesses)) {
  const path = `${witness.archive}/${witness.file}`;
  if (!groups.has(path)) groups.set(path, []);
  groups.get(path).push([key, witness]);
}
const results = {};
for (const [path, entries] of groups) {
  const bytes = readFileSync(path);
  const wanted = new Set(entries.map(([, witness]) => witness.drawIndex));
  const lines = new Map();
  let index = 0;
  for await (const line of createInterface({input:createReadStream(path).pipe(createGunzip()), crlfDelay:Infinity})) {
    if (wanted.has(index)) lines.set(index, line);
    index++;
  }
  assert.equal(index, 10000);
  for (const [key, witness] of entries) {
    assert.equal(sha(bytes), witness.fileSha256);
    assert(lines.has(witness.drawIndex));
    const line = `${lines.get(witness.drawIndex)}\n`;
    assert.equal(sha(line), witness.lineSha256);
    const record = JSON.parse(line);
    assert.equal(record.profile, witness.profile);
    assert.equal(record.seed, witness.seed);
    assert.equal(record.drawIndex, witness.drawIndex);
    assert.deepEqual(record.word, witness.word);
    const config = witness.policy === 'default' ? englishConfig : {...englishConfig, splitVowels:active.splitVowels, followingLetters:active.followingLetters};
    verifyLexicalSpellingOperations(witness.word, config);
    verifyFinalWordSourceLinks(witness.word);
    verifyConfiguredAllomorphs(witness.word, config);
    const counts = endpointCounts(witness.word);
    assert.equal(counts['endpoint/lexical/configuredViolation'] ?? 0, 0);
    assert.equal(counts['endpoint/surface/configuredViolation'] ?? 0, 0);
    results[key] = counts;
  }
}
assert.equal(Object.keys(results).length, selection.witnesses);
writeFileSync(`${directory}/verification.json`, JSON.stringify({passed:true, witnesses:selection.witnesses, witnessSha256:sha(witnessBytes), verifierSha256:sha(readFileSync(new URL(import.meta.url))), records:results, scope:'Exact archive-row binding and all three configured production validators for retained witnesses; full corpus replay remains separate.'}, null, 2)+'\n', {flag:'wx'});
console.log(JSON.stringify({passed:true, witnesses:selection.witnesses}));
