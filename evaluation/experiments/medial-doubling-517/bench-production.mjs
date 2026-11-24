import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

const modes = ["lexicon", "text"];
const seeds = [42, 1001, 2002, 3003, 4004];
const expectedWords = modes.length * seeds.length * 500;
if (process.argv[2] === "sample") {
  const api = await import(pathToFileURL(process.argv[3]).href);
  api.generateWords(1000, {seed: 3851});
  let checksum = 0;
  let errors = 0;
  const start = performance.now();
  const groups = modes.flatMap(mode => seeds.map(seed => api.generateWords(500, {seed, mode})));
  const ms = performance.now() - start;
  for (const words of groups) {
    assert.equal(words.length, 500);
    for (const word of words) {
      if (!word.written.clean || !word.pronunciation || !word.syllables.length) errors++;
      checksum = (checksum * 31 + word.written.clean.charCodeAt(0) + word.written.clean.length * 17) >>> 0;
    }
  }
  assert.equal(errors, 0);
  assert.notEqual(checksum, 0);
  console.log(JSON.stringify({ ms, words: expectedWords, errors, checksum }));
} else {
  const expectedChecksums = new Map();
  for (let round = 0; round < 7; round++) {
    const sides = round % 2 === 0 ? ["base", "production"] : ["production", "base"];
    const measures = {};
    for (const side of sides) {
      const proc = spawnSync(process.execPath, [process.argv[1], "sample",
        import.meta.dirname + "/" + side + "/dist/index.js"], {encoding: "utf8"});
      assert.equal(proc.status, 0, proc.stderr);
      const sample = JSON.parse(proc.stdout.trim());
      assert.equal(sample.words, expectedWords);
      assert.equal(sample.errors, 0);
      if (!expectedChecksums.has(side)) expectedChecksums.set(side, sample.checksum);
      assert.equal(sample.checksum, expectedChecksums.get(side));
      measures[side] = sample;
    }
    assert.notEqual(expectedChecksums.get("base"), expectedChecksums.get("production"));
    console.log(JSON.stringify({ round: round + 1, sides, ...measures, ratio: measures.production.ms / measures.base.ms }));
  }
}
