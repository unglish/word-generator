import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [beforeRoot, afterRoot] = process.argv.slice(2);
const protocol = JSON.parse(readFileSync(resolve(afterRoot, 'evaluation/quality/protocol.json'), 'utf8'));

async function load(root: string) {
  const module = (name: string) => import(pathToFileURL(resolve(root, 'src', name)).href);
  const { generateWord } = await module('index.ts');
  const { createSeededRng } = await module('utils/random.ts');
  const { withStageDraws } = await module('test-support/stage-stream-probe.ts');
  return (options, seed: number) => {
    const rand = createSeededRng(seed);
    return () => withStageDraws(() => generateWord({ ...options, rand, trace: true }));
  };
}

const before = await load(beforeRoot), after = await load(afterRoot);
const results = [];
for (const { id, options, seeds } of protocol.profiles) {
  let checked = 0;
  for (const seed of seeds.development) {
    const a = before(options, seed), b = after(options, seed);
    for (let index = 0; index < 1_000; index++) {
      const left = a(), right = b();
      const where = `${id} seed ${seed} draw ${index}`;
      assert.deepEqual(left.value.trace.random, right.value.trace.random, where);
      assert.deepEqual(left.draws.word, right.draws.word, where);
      assert.equal(left.draws.attempts[0].plan_shape ?? 0, right.draws.attempts[0].plan_shape ?? 0, where);
      if (id === 'monosyllables-bare') assert.deepEqual(left, right, where);
      checked++;
    }
  }
  results.push({ profile: id, checked });
}
console.log(JSON.stringify({ wordKeysWordStageDrawsAndFirstAttemptShapeDraws: 'identical', bareMonosyllableWordsTracesAndAllDrawCounts: 'identical', results }, null, 2));
