import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { createGunzip, gunzipSync } from 'node:zlib';
import { englishConfig } from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/src/index.ts';
import { verifyLexicalSpellingOperations } from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/src/core/lexical-spelling-evidence.ts';
import { verifyFinalWordSourceLinks } from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/src/core/final-word-sources.ts';
import { verifyConfiguredAllomorphs } from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/src/core/morphology/allomorph-evidence.ts';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = await readFile(new URL('witnesses.json.gz', import.meta.url));
const witnesses = JSON.parse(gunzipSync(bytes)).witnesses;
const registration = JSON.parse(await readFile('/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/evaluation/experiments/final-word-ownership/measurement.json'));
const config = { ...englishConfig, splitVowels: registration.configuration.splitVowels, followingLetters: registration.configuration.followingLetters };
for (const [label, witness] of Object.entries(witnesses)) {
  const reader = createInterface({ input: createReadStream(`/private/tmp/q02-final-word-provenance-v1/${witness.archiveFile}`).pipe(createGunzip()), crlfDelay: Infinity });
  let found = false;
  for await (const line of reader) {
    const row = JSON.parse(line);
    if (row.drawIndex !== witness.drawIndex) continue;
    assert.equal(row.profile, witness.profile); assert.equal(row.seed, witness.seed);
    assert.equal(sha(line + '\n'), witness.archivedLineSha256); assert.deepEqual(row.word, witness.word);
    found = true; break;
  }
  assert(found, label);
  verifyLexicalSpellingOperations(witness.word, config);
  verifyFinalWordSourceLinks(witness.word);
  verifyConfiguredAllomorphs(witness.word, config);
}
await writeFile(new URL('witness-verification.json', import.meta.url), JSON.stringify({ passed: true, records: Object.keys(witnesses).length, witnessesSha256: sha(bytes), runnerSha256: sha(await readFile(new URL(import.meta.url))), scope: 'Each retained witness equals its archived word at the stated coordinate and passes configured replay/source/allomorph checks. Illustrative subset only.' }, null, 2) + '\n', { flag: 'wx' });
console.log('Nine retained witnesses match archived records and pass production replay.');
