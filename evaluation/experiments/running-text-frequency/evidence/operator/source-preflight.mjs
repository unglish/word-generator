import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const root = '/Users/ryanbetts/.codex/worktrees/linguistic-q19-frequency/word-generator';
const expected = 'eed4fafe282793bb3e45262dbc73e04605be815f';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const files = [root + '/evaluation/corpus/frequency-source.ts', root + '/evaluation/corpus/cmu.ts',
  '/private/tmp/q19-subtlexus-wordforms.tsv', '/private/tmp/q17-cmudict-74790861.dict'];
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
const { parseFrequencyTable, joinFrequencyPronunciations } = await import(pathToFileURL(files[0]).href);
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
const after = await pins(); assert.deepEqual(after, before);
const result = { passed: true, scope: 'Complete source selection and token coverage; no fit or generator-output quality measurement.',
  commit: expected, before, after, coverage: joined.coverage, selectedDigest, joinedDigest };
await writeFile('/private/tmp/q19-source-preflight-v1.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result));
