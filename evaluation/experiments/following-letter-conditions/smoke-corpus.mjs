import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureRun } from '../../quality/capture.ts';
import { englishConfig } from '../../../src/index.ts';
import { analyzeFollowing, validateAccounting } from './analyze-following.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const destination = process.argv[2];
assert.match(destination ?? '', /^\/private\/tmp\/q14b-corpus-smoke-v[1-9][0-9]*$/);
await mkdir(destination);
const protocol = JSON.parse(await readFile(join(root, 'evaluation/quality/protocol.json')));
protocol.id = 'q14b-runner-smoke'; protocol.wordsPerReplicate = 3; protocol.reviewDrawsPerReplicate = 1;
for (const profile of protocol.profiles) for (const cohort of ['development', 'validation']) profile.seeds[cohort] = profile.seeds[cohort].slice(0, 2);
const archive = join(destination, 'archive');
await captureRun({ root, out: archive, id: 'q14b-runner-smoke', cohort: 'development', protocol, configuration: englishConfig });
const manifestSha256 = createHash('sha256').update(await readFile(join(archive, 'manifest.json'))).digest('hex');
await assert.rejects(analyzeFollowing({ root, archive, out: join(destination, 'wrong-hash'), manifestSha256: '0'.repeat(64), configuration: englishConfig }), /Wrong archive authority/);
const report = await analyzeFollowing({ root, archive, out: join(destination, 'analysis'), manifestSha256, configuration: englishConfig });
assert.equal(report.words, 24);
const all = report.groups.find(group => JSON.stringify(group.dimensions) === '["all"]');
assert.equal(all.counts.words, 24);
assert.throws(() => validateAccounting({ counts: { phones: 1 }, events: [] }), /Incomplete event population/);
await writeFile(join(destination, 'smoke-result.json'), JSON.stringify({ passed: true, words: 24, manifestSha256,
  assertions: ['exact manifest binding', '8 complete ordered streams', 'all-group word total', 'invalid accounting rejected', 'source and artifact closure checks'],
  note: 'Runner smoke test, not the registered 200000-word baseline' }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: true, destination, words: report.words }));
