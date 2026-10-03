import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installedDependencies } from './dependency-closure.mjs';

const roots = {
  control: '/Users/ryanbetts/.codex/worktrees/linguistic-q11b-control/word-generator',
  candidate: '/Users/ryanbetts/.codex/worktrees/linguistic-q20-style/word-generator',
};
const commits = { control: '1159465fe6c10f55a97e8c5851e8a75c604450e7', candidate: '4f4c95d555a00f1d8cb44892a72e57748f377948' };
const out = '/private/tmp/q20-whole-lint-v1';
const npm = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/npm';
const tools = dirname(fileURLToPath(import.meta.url));
async function pin(path) {
  const bytes = await readFile(path);
  return { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}
async function identity() {
  const result = { node: await pin(process.execPath), npm: await pin(npm), tools: {} , sources: {} };
  for (const name of ['check-lint.mjs', 'dependency-closure.mjs']) result.tools[name] = await pin(join(tools, name));
  for (const [arm, root] of Object.entries(roots)) {
    const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    assert.equal(git('rev-parse', 'HEAD'), commits[arm]);
    assert.equal(git('status', '--porcelain', '--untracked-files=no'), '');
    const tracked = {};
    for (const name of git('ls-files', '-z').split('\0').filter(Boolean)) tracked[name] = await pin(join(root, name));
    result.sources[arm] = { commit: commits[arm], tracked, dependencies: await installedDependencies(root, ['eslint', '@eslint/js', 'globals', 'typescript-eslint']) };
  }
  return result;
}
await mkdir(out, { mode: 0o700 });
const save = (name, value) => writeFile(join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const before = await identity();
await save('before.json', before);
const results = [];
try {
  for (const [arm, root] of Object.entries(roots)) {
    const processResult = spawnSync(npm, ['run', 'lint'], { cwd: root, env: { ...process.env, PATH: dirname(process.execPath) + ':' + process.env.PATH } });
    await writeFile(join(out, arm + '.log'), Buffer.concat([processResult.stdout ?? Buffer.alloc(0), processResult.stderr ?? Buffer.alloc(0)]), { flag: 'wx' });
    const record = { arm, command: [npm, 'run', 'lint'], code: processResult.status, signal: processResult.signal, startError: processResult.error ? String(processResult.error) : null, log: await pin(join(out, arm + '.log')) };
    results.push(record);
    await save(arm + '-result.json', record);
    assert.equal(record.startError, null); assert.equal(record.signal, null); assert(Number.isInteger(record.code));
    assert.deepEqual(await identity(), before);
  }
  const after = await identity();
  await save('complete.json', { passed: true, results, before, after, scope: 'Original whole-repository lint executed on both exact sources; every failure retained. Successful recording is not passing lint.' });
  console.log(JSON.stringify(results));
} catch (error) {
  await save('failure.json', { error: String(error), stack: error.stack, results });
  throw error;
}
