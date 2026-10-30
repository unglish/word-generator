import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, realpath, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { installedDependencies } from './dependency-closure.mjs';
const root = '/Users/ryanbetts/.codex/worktrees/linguistic-q17-model/word-generator';
const source = '/private/tmp/q17-cmudict-74790861.dict';
const directory = '/private/tmp/q17-registered-fit-v1';
const tools = dirname(fileURLToPath(import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const expectedCommit = process.argv[2];
assert.match(expectedCommit ?? '', /^[a-f0-9]{40}$/);
async function pin(path) { const bytes = await readFile(path); return { bytes: bytes.length, sha256: hash(bytes) }; }
async function snapshot() {
  assert.equal(git('rev-parse', 'HEAD'), expectedCommit);
  assert.equal(git('status', '--porcelain', '--untracked-files=no'), '');
  const files = {};
  for (const path of git('ls-files').split('\n')) files[path] = await pin(join(root, path));
  for (const key of ['NODE_OPTIONS', 'NODE_PATH', 'ESBUILD_BINARY_PATH', 'TSX_TSCONFIG_PATH']) assert(!process.env[key], key);
  return { commit: expectedCommit, files, source: await pin(source),
    tools: { runner: await pin(fileURLToPath(import.meta.url)), dependencies: await pin(join(tools, 'dependency-closure.mjs')) },
    environment: Object.fromEntries(['PATH', 'LANG', 'LC_ALL', 'TZ', 'CI'].map(key => [key, process.env[key] ?? null])),
    node: { version: process.version, path: await realpath(process.execPath), ...await pin(process.execPath) },
    dependencies: await installedDependencies(root) };
}
await mkdir(directory);
const save = (name, value) => writeFile(join(directory, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
try {
  const before = await snapshot(); await save('before.json', before);
  const { writeConditionalExperiment } = await import(pathToFileURL(join(root, 'evaluation/corpus/conditional-builder.ts')).href);
  const artifactPath = join(directory, 'artifact.json');
  const envelope = await writeConditionalExperiment(root, source, artifactPath);
  const after = await snapshot(); assert.deepEqual(after, before, 'Execution inputs changed during fitting');
  await save('complete.json', { passed: true, digest: envelope.digest, artifact: await pin(artifactPath), after });
  console.log(JSON.stringify({ passed: true, artifactPath, digest: envelope.digest }));
} catch (error) {
  await save('failure.json', { error: String(error), stack: error.stack }); throw error;
}
