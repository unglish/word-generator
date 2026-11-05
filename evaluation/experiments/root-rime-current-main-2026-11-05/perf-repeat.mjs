import { writeFileSync } from 'node:fs';
import { generateWords } from '../../src/index.ts';
generateWords(5000,{seed:901});
const trials=[];
for(let trial=0;trial<7;trial++) {
 const start=performance.now(); const words=generateWords(20000,{seed:10000+trial});
 const elapsedMs=performance.now()-start;
 trials.push({seed:10000+trial,words:words.length,elapsedMs,wordsPerSecond:words.length*1000/elapsedMs});
}
writeFileSync(process.argv[2],JSON.stringify(trials,null,2));
console.log(JSON.stringify(trials,null,2));
