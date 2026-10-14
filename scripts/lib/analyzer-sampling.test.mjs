import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { createSeededRng, generateWord } from '../../dist/index.js';
import { computePhonemeQualityMetrics } from '../../dist/core/phoneme-quality.js';
import { deriveMetrics as phonemeMetrics } from '../analyze-cmu-phonemes.mjs';
import { deriveMetrics as trigramMetrics } from '../analyze-cmu-trigrams.mjs';
import { parseSeeds, sampleWords, traceWitnesses, validateSampleCount } from './analyzer-sampling.mjs';
import { normalizeGeneratedPhoneme } from '../../dist/core/phoneme-normalization.js';
import { loadPhonemeNormalization } from './phoneme-normalization.mjs';

const options = { seed: 42, count: 25, mode: 'lexicon', morphology: false };

test('each replicate consumes a continuous public-API RNG stream, reproducibly', () => {
  const first = [...sampleWords(options)];
  assert.deepEqual([...sampleWords(options)], first);
  const rand = createSeededRng(options.seed);
  for (const draw of first) assert.deepEqual(draw.word, generateWord({ mode: options.mode, morphology: false, rand, trace: false }));
  const nextSeed = [...sampleWords({ ...options, seed: 43 })];
  assert.notDeepEqual(first.slice(1).map(draw => draw.word), nextSeed.slice(0, -1).map(draw => draw.word));
  assert.deepEqual(first.map(draw => draw.drawIndex), Array.from({ length: options.count }, (_, i) => i));
});

test('replayed outliers retain their exact stream locations and full trace', () => {
  const words = [...sampleWords(options)];
  const traced = traceWitnesses({ earlier: words[3], later: words[21], absent: undefined }, options);
  for (const key of ['earlier', 'later']) {
    const { trace, ...word } = traced[key].word;
    const { trace: untraced, ...expected } = words[traced[key].drawIndex].word;
    assert.deepEqual(word, expected);
    assert.ok(trace.stages.length > 0);
    assert.equal(untraced, undefined);
  }
  assert.equal(traced.absent, undefined);
});

test('reject duplicate, aliased or invalid seed schedules and fractional sample sizes', () => {
  assert.deepEqual(parseSeeds('0,42,4294967295'), [0, 42, 4294967295]);
  for (const input of ['', '42,42', '42,', '-1', '1.5', '4294967296', 'NaN', 'Infinity']) assert.throws(() => parseSeeds(input));
  for (const count of [0, -1, 0.5, NaN, Infinity]) assert.throws(() => validateSampleCount(count));
});

test('CLI phoneme scores use the same union-aware implementation as the core gate', () => {
  const phonemeCounts = { a: 60, b: 39 };
  const cmuFreqPct = { a: 60, b: 39, c: 1 };
  const cli = phonemeMetrics({ phonemeCounts, cmuFreqPct, minCommonBaselinePct: 0.5 });
  const core = computePhonemeQualityMetrics(phonemeCounts, cmuFreqPct, 0.5);
  for (const [key, value] of Object.entries(core)) assert.deepEqual(cli[key], value);
  assert.equal(cli.topUnderRepresented[0].phoneme, 'c');
  assert.ok(cli.jensenShannonBits > 0);
});

test('trigram gap rankings and distances include missing and generated-only categories', () => {
  const result = trigramMetrics({ trigramCounts: { aaa: 60, bbb: 39, zzz: 20 }, totalTrigrams: 119, cmuFreq: { aaa: 0.6, bbb: 0.39, ccc: 0.01 }, minOverrepFreq: 0, minUnderrepFreq: 0 });
  assert.equal(result.topUnderRepresented[0].trigram, 'ccc');
  assert.ok(result.topAbsoluteGap.some(row => row.trigram === 'zzz' && row.ratio === null));
  assert.ok(result.topAbsoluteGap.some(row => row.trigram === 'ccc' && row.generatedFreq === 0));
  assert.equal(result.missingReferenceMassPct, 1);
  assert.ok(result.nonReferenceMassPct > 0);
  assert.ok(result.jensenShannonBits > 0);
  const empty = trigramMetrics({ trigramCounts: {}, totalTrigrams: 0, cmuFreq: { aaa: 1 }, minOverrepFreq: 0, minUnderrepFreq: 0 });
  assert.equal(empty.jensenShannonBits, null);
  assert.equal(empty.topUnderRepresented[0].ratio, 0);
});

test('both CLIs persist truthful sample sizes and category-matching full witnesses', () => {
  for (const kind of ['phonemes', 'trigrams']) {
    const output = `diagnostics-test-${process.pid}-${kind}`;
    try {
      execFileSync(process.execPath, [`scripts/analyze-cmu-${kind}.mjs`, '--seeds', '42,123', '--count-per-seed', '3', '--output', output], { stdio: 'pipe' });
      const report = JSON.parse(readFileSync(`memory/${output}.json`, 'utf8'));
      const markdown = readFileSync(`memory/${output}.md`, 'utf8');
      assert.equal(report.config.totalWords, 6);
      assert.equal(report.config.sampling, 'continuous-seeded-stream-v1');
      assert.match(markdown, /Analysis — 6 words/);
      assert.doesNotMatch(markdown, /2M Analysis/);
      assert.ok(Object.keys(report.traceWitnesses).length > 0);
      for (const [category, draw] of Object.entries(report.traceWitnesses)) {
        assert.ok(draw.word.trace.stages.length > 0);
        if (kind === 'trigrams') assert.ok(draw.word.written.clean.toLowerCase().includes(category));
        else {
          const phones = draw.word.syllables.flatMap(syllable => [...syllable.onset, ...syllable.nucleus, ...syllable.coda]);
          assert.ok(phones.some(phone => normalizeGeneratedPhoneme(phone.sound, loadPhonemeNormalization()) === category));
        }
      }
    } finally {
      for (const suffix of ['json', 'md']) rmSync(`memory/${output}.${suffix}`, { force: true });
    }
  }
});
