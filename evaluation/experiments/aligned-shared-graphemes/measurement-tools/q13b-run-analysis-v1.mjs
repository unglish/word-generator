import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { analyze } from '/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/evaluation/experiments/aligned-shared-graphemes/analyze-shared.mjs';
const root = '/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const candidate = '/private/tmp/q13b-aligned-shared-graphemes-candidate-v1';
const complete = JSON.parse(await readFile(candidate + '-freeze/complete.json'));
assert.equal(complete.passed, true); assert.equal(complete.words, 200000);
const protocol = join(root, 'evaluation/quality/protocol.json');
const registration = join(root, 'evaluation/experiments/aligned-shared-graphemes/protocol.json');
const registered = JSON.parse(await readFile(registration));
for (const variant of ['control', 'candidate']) {
  const archive = variant === 'control' ? registered.controlArchive : candidate;
  const bytes = await readFile(join(archive, 'manifest.json'));
  if (variant === 'control') assert.equal(sha(bytes), registered.controlManifestSha256);
  else assert.equal(sha(bytes), complete.manifest.sha256);
  const manifest = JSON.parse(bytes).manifest;
  const options = { archive, out: `/private/tmp/q13b-${variant}-analysis-v1`, variant,
    protocol, 'protocol-sha256': sha(await readFile(protocol)), registration,
    'registration-sha256': sha(await readFile(registration)), 'manifest-sha256': sha(bytes),
    'source-digest': manifest.generator.sourceDigest };
  await writeFile(`/private/tmp/q13b-${variant}-analysis-inputs-v1.json`, JSON.stringify(options, null, 2) + '\n', { flag: 'wx' });
  const report = await analyze(options);
  console.log(JSON.stringify({ variant, words: report.words, groups: report.groups.length, witnesses: report.witnesses.length }));
}
