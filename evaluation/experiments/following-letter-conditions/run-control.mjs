import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { englishConfig } from '../../../src/index.ts';
import { analyzeFollowing } from './analyze-following.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const binding = JSON.parse(await readFile(new URL('./baseline-binding.json', import.meta.url)));
const protocol = JSON.parse(await readFile(join(root, 'evaluation/quality/protocol.json')));
const manifest = JSON.parse(await readFile(join(binding.archive, 'manifest.json'))).manifest;
assert.deepEqual(manifest.protocol, protocol, 'Control must use the unchanged development protocol');
assert.equal(protocol.profiles.reduce((sum, profile) => sum + profile.seeds.development.length * protocol.wordsPerReplicate, 0), 200000);
const registration = JSON.parse(await readFile(join(root, 'evaluation/experiments/split-digraphs/measurement.json')));
const configuration = { ...englishConfig, splitVowels: registration.splitVowels };
const out = process.argv[2];
assert.match(out ?? '', /^\/private\/tmp\/q14b-control-analysis-v[1-9][0-9]*$/);
await analyzeFollowing({ root, archive: binding.archive, out, manifestSha256: binding.manifestSha256, configuration });
