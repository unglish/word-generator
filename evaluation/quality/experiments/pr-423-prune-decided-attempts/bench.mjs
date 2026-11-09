import { createGenerator, englishConfig } from "/Users/ryanbetts/.t3/worktrees/word-generator/t3-cc1ba2f2/dist/index.js";
const t0 = performance.now();
const g = createGenerator(englishConfig);
const t1 = performance.now();
let n = 0;
for (let i = 0; i < 50000; i++) { g.generateWord({ seed: i }); n++; }
const t2 = performance.now();
console.log(`create ${(t1-t0).toFixed(1)}ms, ${n} words ${(t2-t1).toFixed(0)}ms => ${((t2-t1)/n*1000).toFixed(1)}us/word`);
