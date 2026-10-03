import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const root = '/Users/ryanbetts/.codex/worktrees/linguistic-q19-frequency/word-generator';
const expected = 'c9628f01518320269def82845a9b464d439ea0c4';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const files = [root + '/evaluation/corpus/frequency-source.ts', root + '/evaluation/corpus/cmu.ts',
  '/private/tmp/q19-subtlexus-wordforms.tsv', '/private/tmp/q17-cmudict-74790861.dict',
  '/private/tmp/q19-pos-literal-export-v1.json', '/private/tmp/q19-subtlexus-pos.xlsx',
  '/private/tmp/q19-subtlexus-license.txt', root + '/evaluation/corpus/export-subtlex-pos.py',
  process.execPath, new URL('./source-accounting.json', import.meta.url).pathname];
async function pins() {
  assert.equal(git('rev-parse', 'HEAD'), expected);
  assert.equal(git('status', '--porcelain', '--untracked-files=no'), '');
  const entries = await Promise.all(files.map(async path => {
    const bytes = await readFile(path); return [path, { bytes: bytes.length, sha256: hash(bytes) }];
  }));
  return Object.fromEntries(entries);
}
const before = await pins();
assert.equal(before[files[2]].sha256, 'c5f86f065fc5d057fbf366433b8c5ca550aa7c24e128362dea4394f2b29c86e4');
assert.equal(before[files[3]].sha256, '81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22');
const { parseFrequencyTable, joinFrequencyPronunciations, bindLiteralPosRows } = await import(pathToFileURL(files[0]).href);
const { parseCmuRecords, selectCompatibleCmu } = await import(pathToFileURL(files[1]).href);
const frequencies = parseFrequencyTable(await readFile(files[2], 'utf8'));
const cmu = selectCompatibleCmu(parseCmuRecords(await readFile(files[3], 'utf8')));
const joined = joinFrequencyPronunciations(frequencies, cmu.entries);
const python = JSON.parse(await readFile(new URL('./source-accounting.json', import.meta.url), 'utf8'));
assert.deepEqual(joined.coverage, Object.fromEntries(Object.entries(python.originalFrequencyTable)
  .filter(([key]) => key !== 'orderedJoinedSpellingCountPhoneDigest')));
const selectedDigest = hash(JSON.stringify(cmu.entries.map(({ spelling, tokens }) => [spelling, tokens])));
assert.equal(selectedDigest, python.orderedSelectedCmuDigest);
const joinedDigest = hash(JSON.stringify(joined.joined.map(({ frequency, pronunciation }) =>
  [frequency.spelling, frequency.count, pronunciation.tokens])));
assert.equal(joinedDigest, python.originalFrequencyTable.orderedJoinedSpellingCountPhoneDigest);
const exported = JSON.parse(await readFile(files[4], 'utf8'));
assert.equal(exported.version, 'subtlex-pos-literal-export-v1');
assert.deepEqual(exported.source, before[files[5]]);
assert.equal(exported.license.sha256, before[files[6]].sha256);
assert.equal(exported.license.text, await readFile(files[6], 'utf8'));
const bound = bindLiteralPosRows(frequencies, exported.rows);
const pos = { missingOrNonintegerRows: 0, massGreaterThanWordCountRows: 0,
  massLessThanWordCountRows: 0, wordMinusTaggedTokenMass: 0, typesPerTag: {}, tokensPerTag: {} };
for (const { counts, allocation } of bound.values()) {
  if (counts === null) { pos.missingOrNonintegerRows++; continue; }
  const delta = allocation.wordMinusTaggedCount;
  pos.wordMinusTaggedTokenMass += delta;
  if (delta < 0) pos.massGreaterThanWordCountRows++;
  if (delta > 0) pos.massLessThanWordCountRows++;
  for (const { tag, count } of counts) {
    pos.typesPerTag[tag] = (pos.typesPerTag[tag] ?? 0) + 1;
    pos.tokensPerTag[tag] = (pos.tokensPerTag[tag] ?? 0) + count;
  }
  const masses = Object.values(allocation.masses);
  const denominator = masses.reduce((product, mass) => product * BigInt(mass.denominator), 1n);
  const numerator = masses.reduce((sum, mass) => sum + BigInt(mass.numerator)
    * (denominator / BigInt(mass.denominator)), 0n);
  assert.equal(numerator, BigInt(allocation.wordCount) * denominator);
}
assert.deepEqual(pos, python.pos);
const after = await pins(); assert.deepEqual(after, before);
const result = { passed: true, scope: 'Complete source selection and token coverage; no fit or generator-output quality measurement.',
  commit: expected, before, after, coverage: joined.coverage, pos, posRows: bound.size, selectedDigest, joinedDigest };
await writeFile('/private/tmp/q19-source-pos-preflight-v1.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result));
