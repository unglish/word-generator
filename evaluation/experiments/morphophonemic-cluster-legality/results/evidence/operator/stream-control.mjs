import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {generateWord, generateWords, createSeededRng} from '/Users/ryanbetts/.codex/worktrees/linguistic-q11b-control/word-generator/src/index.ts';

const root = '/Users/ryanbetts/.codex/worktrees/linguistic-q11b-control/word-generator';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function sourcePins() {
  const git = args => execFileSync('git', args, {cwd:root, encoding:'utf8'});
  const files = git(['ls-files','src']).trim().split('\n');
  return {commit:git(['rev-parse','HEAD']).trim(), patchSha256:sha(git(['diff','HEAD','--','src'])),
    files:Object.fromEntries(files.map(file => [file, sha(readFileSync(`${root}/${file}`))])),
    node:process.version, lockfileSha256:sha(readFileSync(`${root}/package-lock.json`))};
}
const before = sourcePins();
// Authenticate the public batch/stream adapters separately; this small equality
// check does not replace the original 20,000-word test or the scan below.
const batchRng = createSeededRng(20260926), parityRng = createSeededRng(20260926);
const batch = generateWords(100, {rand:batchRng, morphology:false, trace:true});
for (const word of batch) assert.deepEqual(generateWord({rand:parityRng, morphology:false, trace:true}), word);
assert.equal(batchRng(), parityRng());

const rng = createSeededRng(20260926), digest = createHash('sha256');
let duplicates = 0, extensions = 0, rejectedRepeats = 0;
const witnesses = {};
for (let drawIndex = 0; drawIndex < 20000; drawIndex++) {
  const word = generateWord({rand:rng, morphology:false, trace:true});
  digest.update(JSON.stringify(word)+'\n');
  for (const syllable of word.syllables) for (let i = 1; i < syllable.coda.length; i++) {
    if (syllable.coda[i].sound === syllable.coda[i-1].sound) duplicates++;
  }
  for (const event of word.trace.structural) {
    if (event.event === 'finalS' || event.event === 'nasalStopExtension') extensions++;
    if (event.event === 'codaExtensionRejected' && event.reason === 'repetition') rejectedRepeats++;
    if (['finalS','nasalStopExtension','codaExtensionRejected'].includes(event.event)) {
      const key = `${event.event}/${event.reason ?? 'accepted'}`;
      witnesses[key] ??= {drawIndex, word};
    }
  }
  if ((drawIndex+1)%5000 === 0) console.log(JSON.stringify({words:drawIndex+1, duplicates, extensions, rejectedRepeats}));
}
const after = sourcePins();
assert.deepEqual(after, before);
assert.equal(duplicates, 0);
assert(extensions > 0 && rejectedRepeats > 0);
writeFileSync('/private/tmp/q11b-control-stream.json', JSON.stringify({passed:true, words:20000, seed:20260926,
  duplicates, extensions, rejectedRepeats, outputSha256:digest.digest('hex'), nextRng:rng(),
  parityWords:100, parityNextProbes:1, before, after, witnesses,
  scope:'Same public seed stream and 20,000-word structural assertion in a separate retention-bounded diagnostic. Original timed-out test remains failed; full composed-control corpus measurement is separate.'}, null, 2)+'\n', {flag:'wx'});
