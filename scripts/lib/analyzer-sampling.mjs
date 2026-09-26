import { createSeededRng, generateWord } from '../../dist/index.js';

export const SAMPLING_METHOD = 'continuous-seeded-stream-v1';

export function parseSeeds(input) {
  const tokens = input.split(',').map(token => token.trim());
  const seeds = tokens.map(Number);
  if (tokens.some(token => !token) || seeds.some(seed => !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)) {
    throw new Error('Seeds must be unsigned 32-bit integers.');
  }
  if (new Set(seeds).size !== seeds.length) throw new Error('Each replicate must have a distinct seed.');
  return seeds;
}

export function validateSampleCount(count) {
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('count-per-seed must be a positive integer.');
}

export function* sampleWords({ seed, count, mode, morphology, trace = false }) {
  validateSampleCount(count);
  const rand = createSeededRng(seed);
  for (let drawIndex = 0; drawIndex < count; drawIndex++) {
    yield { seed, drawIndex, word: generateWord({ mode, morphology, rand, trace }) };
  }
}

export function traceWitnesses(locations, options) {
  const bySeed = new Map();
  for (const [category, location] of Object.entries(locations)) {
    if (!location) continue;
    const requests = bySeed.get(location.seed) ?? new Map();
    const categories = requests.get(location.drawIndex) ?? [];
    categories.push(category);
    requests.set(location.drawIndex, categories);
    bySeed.set(location.seed, requests);
  }
  const witnesses = {};
  for (const [seed, requests] of bySeed) {
    const count = Math.max(...requests.keys()) + 1;
    for (const draw of sampleWords({ ...options, seed, count, trace: true })) {
      for (const category of requests.get(draw.drawIndex) ?? []) witnesses[category] = draw;
    }
  }
  return witnesses;
}
