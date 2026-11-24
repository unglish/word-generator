import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { createGunzip } from 'node:zlib';
import { inspect } from './screen.mjs';

const [out, candidate = 'candidate', wantedProfile, harness = process.cwd()] = process.argv.slice(2);
if (!out) throw new Error('Usage: paired-profiles.mjs quality-output-dir [candidate-run] [profile] [harness-root]');
const { distributionDistance } = await import(pathToFileURL(join(harness, 'evaluation/quality/distribution.ts')));
const protocol = JSON.parse(await readFile(join(harness, 'evaluation/quality/protocol.json'), 'utf8'));
const reference = JSON.parse(await readFile(join(harness, 'data/cmu/cmu-lexicon-trigrams.json'), 'utf8'));
const rule = 'medialOnsetDoubling';
const profiles = wantedProfile ? protocol.profiles.filter(profile => profile.id === wantedProfile) : protocol.profiles;
assert.ok(profiles.length);
const result = {};
const raw = (run, filename) => createInterface({
  input: createReadStream(join(out, run, 'words', filename)).pipe(createGunzip()), crlfDelay: Infinity,
});
const emptySide = () => ({ count: 0, eligible: 0, doubled: 0, byRootLength: {}, byFollowingStress: {}, grams: {} });
function add(summary, word, read) {
  summary.count++;
  for (const p of read.positions) {
    summary.eligible++;
    summary.doubled += Number(p.doubled);
    for (const [groups, key] of [[summary.byRootLength, p.rootLength >= 4 ? '4+' : p.rootLength], [summary.byFollowingStress, p.nextStress ? 'stressed' : 'unstressed']]) {
      const group = groups[key] ??= { eligible: 0, doubled: 0 };
      group.eligible++;
      group.doubled += Number(p.doubled);
    }
  }
  const spelling = word.written.clean.toLowerCase();
  for (let i = 0; i + 2 < spelling.length; i++) {
    const gram = spelling.slice(i, i + 3);
    if (/^[a-z]{3}$/.test(gram)) summary.grams[gram] = (summary.grams[gram] ?? 0) + 1;
  }
}
function report({ grams, ...summary }) {
  const total = Object.values(grams).reduce((a, b) => a + b, 0);
  const refTotal = Object.values(reference).reduce((a, b) => a + b, 0);
  return { ...summary, trigrams: {
    ...distributionDistance(grams, reference), total,
    named: Object.fromEntries(['tte','err','arr','ott','ann','rre','rri'].map(gram => [gram, {
      observed: grams[gram] ?? 0, expected: reference[gram] * total / refTotal,
    }])),
  } };
}
for (const profile of profiles) {
  const before = emptySide(), after = emptySide();
  const checks = {
    editedWords: 0, allNewEdits: 0, visibleNewDoubles: 0, originalPayloadDifferences: 0,
    vowelChanged: 0, stressLost: 0, nextTense: 0, unmatchedEdits: 0,
  };
  const examples = [];
  const replicates = [];
  for (const seed of profile.seeds.development) {
    const filename = `${profile.id}-${seed}.jsonl.gz`;
    const newLines = raw(candidate, filename)[Symbol.asyncIterator]();
    const streamBefore = emptySide(), streamAfter = emptySide();
    for await (const line of raw('baseline', filename)) {
      const newer = await newLines.next();
      assert.ok(!newer.done, `${filename} ended early`);
      const oldDraw = JSON.parse(line), newDraw = JSON.parse(newer.value);
      const oldWord = oldDraw.word, newWord = newDraw.word;
      assert.equal(oldDraw.drawIndex, newDraw.drawIndex);
      assert.equal(oldDraw.seed, newDraw.seed);
      assert.equal(oldDraw.profile, newDraw.profile);
      assert.equal(oldWord.pronunciation, newWord.pronunciation);
      assert.equal(JSON.stringify(oldWord.syllables), JSON.stringify(newWord.syllables));
      assert.equal(JSON.stringify(oldWord.lexical), JSON.stringify(newWord.lexical));
      assert.equal(JSON.stringify(oldWord.trace.selection), JSON.stringify(newWord.trace.selection));
      const oldRead = inspect(oldWord), newRead = inspect(newWord);
      assert.equal(oldRead.edits, 0);
      add(before, oldWord, oldRead);
      add(after, newWord, newRead);
      add(streamBefore, oldWord, oldRead);
      add(streamAfter, newWord, newRead);
      const edits = newRead.edits;
      if (!edits) {
        assert.deepEqual(oldWord.written, newWord.written);
        checks.originalPayloadDifferences += Number(line !== newer.value);
        continue;
      }
      checks.editedWords++;
      checks.allNewEdits += edits;
      const visible = newRead.positions.filter(p => p.late);
      checks.visibleNewDoubles += visible.length;
      checks.unmatchedEdits += edits - visible.length;
      assert.equal(newWord.written.clean.length - oldWord.written.clean.length, edits);
      assert.equal(newWord.written.hyphenated.replaceAll('&shy;', ''), newWord.written.clean);
      if (visible.length === edits) {
        let restored = newWord.written.clean;
        for (const p of [...visible].reverse()) {
          assert.equal(restored.slice(p.index, p.index + 2), p.letter.repeat(2));
          restored = restored.slice(0, p.index) + restored.slice(p.index + 1);
        }
        assert.equal(restored, oldWord.written.clean);
      }
      for (const p of visible) {
        const rootStart = newWord.lexical?.rootSyllableStart ?? 0;
        const left = newWord.syllables[rootStart + p.syllable - 1];
        if (!left?.nucleus.some(vowel => vowel.sound === p.vowel)) checks.vowelChanged++;
        if (!['ˈ', 'ˌ'].includes(left?.stress)) checks.stressLost++;
        if (p.nextTense || newWord.syllables[rootStart + p.syllable]?.nucleus[0]?.tense === true) checks.nextTense++;
        if (examples.length < 6) examples.push({ seed, drawIndex: newDraw.drawIndex, before: oldWord.written.clean, after: newWord.written.clean, pronunciation: newWord.pronunciation, rootLength: p.rootLength });
      }
    }
    assert.ok((await newLines.next()).done, `${filename} has extra words`);
    assert.equal(streamBefore.count, protocol.wordsPerReplicate, `${filename} is incomplete`);
    replicates.push({ seed, before: report(streamBefore), after: report(streamAfter) });
  }
  result[profile.id] = { before: report(before), after: report(after), checks, examples, replicates };
}
console.log(JSON.stringify(result, null, 2));
