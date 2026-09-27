import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createGenerator, createSeededRng, englishConfig } from '/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/src/index.ts';
import { createBaseSpellingEvidenceVerifier } from '/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/src/core/spelling-evidence.ts';
import { observeSharedSpellings } from '/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/evaluation/experiments/aligned-shared-graphemes/observe-shared.mjs';
const generator = createGenerator(englishConfig), verify = createBaseSpellingEvidenceVerifier(englishConfig);
const rand = createSeededRng(129), counts = Object.fromEntries(englishConfig.sharedSpellings.map(rule => [rule.id, 0]));
const witnesses = {};
for (let drawIndex = 0; drawIndex < 20000; drawIndex++) {
  const word = generator.generateWord({ rand, trace: true, morphology: drawIndex % 2 === 0, mode: drawIndex % 3 ? 'text' : 'lexicon' });
  assert.equal(verify(word.trace.baseSpelling).sharedWriterSchedule, 'verified');
  const result = observeSharedSpellings(word, englishConfig.sharedSpellings);
  for (const key of ['unsupportedFormedSequences', 'partialSourceConsumptions', 'phoneMultiplicityViolations', 'unsupportedInputOwnership', 'silentlyDamagedConstructions']) assert.equal(result.counts[key], 0);
  for (const rule of result.rules) {
    counts[rule.id] += rule.counts.formed;
    if (rule.counts.formed && !witnesses[rule.id]) witnesses[rule.id] = { seed: 129, drawIndex, word };
  }
}
await writeFile('/private/tmp/q13b-active-smoke-v1.json', JSON.stringify({ words: 20000, counts, witnesses }) + '\n', { flag: 'wx' });
assert(Object.values(counts).every(count => count > 0), 'Each registered construction must have positive public usage');
console.log(JSON.stringify({ words: 20000, counts, allLedgersVerified: true }));
