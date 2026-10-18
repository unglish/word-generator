import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { installedDependencies } from './dependency-closure.mjs';
const root = '/Users/ryanbetts/.codex/worktrees/linguistic-q19-frequency/word-generator';
const head = '2144c816efaec4005911e774288258c0ed25f77a';
const out = '/private/tmp/q19-registered-fit-v1';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const directory = fileURLToPath(new URL('.', import.meta.url));
const protocolPath = root + '/evaluation/experiments/running-text-frequency/measurement-preimplementation.json';
const protocol = JSON.parse(await readFile(protocolPath, 'utf8'));
const inputPaths = Object.keys(protocol.sources).map(name => '/private/tmp/' + name);
inputPaths.push('/private/tmp/q19-subtlexus-wordforms.tsv', '/private/tmp/q19-pos-literal-export-v1.json');
async function pin(path) { const bytes = await readFile(path); return { bytes: bytes.length, sha256: hash(bytes) }; }
async function seal() {
  assert.equal(git('rev-parse', 'HEAD'), head);
  assert.equal(git('status', '--porcelain', '--untracked-files=no'), '');
  const paths = git('ls-files', '-z').split('\0').filter(Boolean);
  const tracked = Object.fromEntries(await Promise.all(paths.map(async path => [path, await pin(root + '/' + path)])));
  const inputs = Object.fromEntries(await Promise.all(inputPaths.map(async path => [path, await pin(path)])));
  for (const [name, expected] of Object.entries(protocol.sources)) assert.deepEqual(inputs['/private/tmp/' + name], expected);
  return { head, tracked, inputs, dependencies: await installedDependencies(root), node: await pin(process.execPath),
    nodeVersion: process.version, environment: Object.fromEntries(Object.entries(process.env).map(([key,value]) => [key, hash(value)])),
    runner: await pin(fileURLToPath(import.meta.url)), dependencyTool: await pin(directory + 'dependency-closure.mjs') };
}
await mkdir(out); // Refuse to overwrite any earlier run.
const before = await seal();
await writeFile(out + '/before.json', JSON.stringify(before, null, 2) + '\n', { flag: 'wx' });
const { parseFrequencyTable } = await import(pathToFileURL(root + '/evaluation/corpus/frequency-source.ts'));
const { parseCmuRecords, selectCompatibleCmu } = await import(pathToFileURL(root + '/evaluation/corpus/cmu.ts'));
const { fitFrequencyExperiment } = await import(pathToFileURL(root + '/evaluation/corpus/frequency-experiment.ts'));
const frequencies = parseFrequencyTable(await readFile('/private/tmp/q19-subtlexus-wordforms.tsv', 'utf8'));
const cmu = selectCompatibleCmu(parseCmuRecords(await readFile('/private/tmp/q17-cmudict-74790861.dict', 'utf8')));
const pos = JSON.parse(await readFile('/private/tmp/q19-pos-literal-export-v1.json', 'utf8'));
assert.deepEqual(pos.source, before.inputs['/private/tmp/q19-subtlexus-pos.xlsx']);
assert.equal(pos.license.sha256, before.inputs['/private/tmp/q19-subtlexus-license.txt'].sha256);
assert.equal(pos.license.text, await readFile('/private/tmp/q19-subtlexus-license.txt', 'utf8'));
assert.deepEqual(pos.implementation.script, before.tracked['evaluation/corpus/export-subtlex-pos.py']);
const result = fitFrequencyExperiment(frequencies, cmu.entries, pos.rows);
await writeFile(out + '/artifact.json', JSON.stringify(result) + '\n', { flag: 'wx' });
const after = await seal();
await writeFile(out + '/after.json', JSON.stringify(after, null, 2) + '\n', { flag: 'wx' });
assert.deepEqual(after, before);
const complete = { passed: true, measuredSource: head, artifact: await pin(out + '/artifact.json'),
  coverage: result.coverage, selectedAlpha: { baseline: result.choices.baseline.alpha, candidate: result.choices.candidate.alpha },
  baseline: result.scores.baseline.summary, candidate: result.scores.candidate.summary };
await writeFile(out + '/complete.json', JSON.stringify(complete, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(complete));
