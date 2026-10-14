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
  const stream = createSeededRng(seed);
  let rngOffset = 0;
  const rand = () => {
    rngOffset++;
    return stream();
  };
  for (let drawIndex = 0; drawIndex < count; drawIndex++) {
    const location = { seed, drawIndex, rngOffset };
    yield { ...location, word: generateWord({ mode, morphology, rand, trace }) };
  }
}

/** Regenerates each located draw with a full trace by fast-forwarding its seed's stream. */
export function traceWitnesses(locations, { mode, morphology }) {
  const witnesses = {};
  for (const [category, location] of Object.entries(locations)) {
    if (!location) continue;
    const rand = createSeededRng(location.seed);
    for (let i = 0; i < location.rngOffset; i++) rand();
    witnesses[category] = { seed: location.seed, drawIndex: location.drawIndex, word: generateWord({ mode, morphology, rand, trace: true }) };
  }
  return witnesses;
}
