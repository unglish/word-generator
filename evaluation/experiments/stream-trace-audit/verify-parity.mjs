import assert from "node:assert/strict";
import { generateWord, generateWords, createSeededRng } from "../../../dist/index.js";
let words = 0;
for (const seed of [42,123,456,789,1337]) {
  for (const mode of ["text","lexicon"]) {
    for (const morphology of [false,true]) {
      const batchRng = createSeededRng(seed);
      const streamRng = createSeededRng(seed);
      const options = { mode, morphology, trace: true };
      const batch = generateWords(500, {...options,rand:batchRng});
      for (const expected of batch) {
        assert.deepEqual(generateWord({...options,rand:streamRng}),expected);
        words++;
      }
      assert.equal(streamRng(),batchRng());
    }
  }
}
console.log(JSON.stringify({passed:true,pairedWords:words,streams:20,nextRngProbes:20}));
