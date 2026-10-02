import { canonical } from '../../quality/serialization.ts';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { treePins, executionEnvironment } from './freeze-capture.mjs';

/** Same sample sizes, seeds and thresholds as generate.perf.test.ts; factory setup is outside timing. */
export function benchmark(api, now = () => performance.now(), ci = false) {
  const floor = ci ? 4300 : 4500; const varianceLimit = ci ? 4 : 3;
  api.generateWords(50, { seed: 0 });
  const start = now(); api.generateWords(10000, { seed: 42 }); const elapsed = now() - start;
  assert(elapsed > 0);
  for (let i = 0; i < 50; i++) api.generateWord({ seed: 900000 + i });
  const trials = [];
  for (let trial = 0; trial < 3; trial++) {
    const batches = [];
    for (let batch = 0; batch < 5; batch++) {
      const begin = now();
      for (let i = 0; i < 200; i++) api.generateWord({ seed: trial * 100000 + batch * 200 + i });
      batches.push(now() - begin);
    }
    assert(batches.every(value => value > 0));
    trials.push({ batches, ratio: Math.max(...batches) / Math.min(...batches) });
  }
  const medianVariance = trials.map(trial => trial.ratio).sort((a,b) => a-b)[1];
  const wordsPerSec = 10000000 / elapsed;
  return { sampleSize: 10000, elapsed, wordsPerSec, floor, speedPass: wordsPerSec >= floor,
    trials, medianVariance, varianceLimit, variancePass: medianVariance < varianceLimit };
}

/** Factory instances expose only generateWord; use an identical shared-stream adapter on both variants. */
export function configuredBatchAPI(api, generator) {
  return { generateWord: generator.generateWord,
    generateWords(count, options) {
      const rand = options.rand ?? api.createSeededRng(options.seed);
      const words = [];
      for (let index = 0; index < count; index++) words.push(generator.generateWord({ ...options, rand }));
      return words;
    } };
}

async function main(root, variant, out) {
  assert(['A','B'].includes(variant)); executionEnvironment();
  const before = await treePins(join(root,'src'));
  const api = await import(pathToFileURL(join(root,'src/index.ts')).href);
  const measurement = JSON.parse(await readFile(new URL('./measurement.json',import.meta.url)));
  const configuration = variant === 'B' ? {...api.englishConfig,splitVowels:measurement.splitVowels} : api.englishConfig;
  if (variant === 'A') assert.equal(configuration.splitVowels,undefined);
  const generator = api.createGenerator(configuration);
  const result = benchmark(configuredBatchAPI(api, generator), undefined, process.env.CI === 'true');
  assert.deepEqual(await treePins(join(root,'src')),before,'Performance source changed');
  await writeFile(out,JSON.stringify({variant,root,node:process.version,
    executableSha256:createHash('sha256').update(await readFile(process.execPath)).digest('hex'),
    environment:executionEnvironment(),configuration:canonical(configuration),source:before,...result},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({variant,wordsPerSec:result.wordsPerSec,speedPass:result.speedPass,variancePass:result.variancePass}));
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length,5,'Provide root, A/B and fresh output file');
  await main(resolve(process.argv[2]),process.argv[3],process.argv[4]);
}
