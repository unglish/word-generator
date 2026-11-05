import { generateWords, createSeededRng } from '../../src/index.ts';
import { GOLDEN_CASES } from '../../src/test-support/golden-output.ts';
import { writeFileSync } from 'node:fs';
const cases=GOLDEN_CASES.map(options=> {
  const rng=createSeededRng(options.seed); let calls=0;
  return {options,words:generateWords(40,{...options,rand:()=>{calls++;return rng();},trace:true}),get calls(){return calls;}};
});
writeFileSync(process.argv[2],JSON.stringify(cases));
