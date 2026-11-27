import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(resolve('package.json'));
const ts = require('typescript');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
const source = 'src/core/segment-boundaries.ts';
const revisions = process.argv.slice(2);
assert.ok(revisions.length === 0 || revisions.length === 2);
for (const [measured, final] of (revisions.length ? [revisions] : [
  ['c5003eb5261217aa86a7633892f43274c0ac85ad', '037a298d5a73e774a12de1f1a6714da55e8cb191'],
  ['69dee9b803a6038c6dd5fdda22dd0a489b2ae6b4', '466b421e15a9b6c465b7e67d8c8be84047f414f2'],
])) {
  assert.equal(git('diff', '--name-only', measured, final).trim(), source);
  const before = git('show', `${measured}:${source}`);
  const after = git('show', `${final}:${source}`);
  assert.equal(before, after + '\n');
  const compile = input => ts.transpileModule(input, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext }, fileName: source }).outputText;
  const js = compile(after);
  assert.equal(compile(before), js);
  console.log(`${measured} -> ${final}: the only source change is a final blank line removed. Identical emitted JavaScript, SHA-256 ${createHash('sha256').update(js).digest('hex')}.`);
}
