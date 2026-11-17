import { pathToFileURL } from 'node:url';
const root = process.argv[2];
const label = process.argv[3];
const { createGenerator, englishConfig, createSeededRng } = await import(pathToFileURL(root + '/src/index.ts').href);
const gen = createGenerator(englishConfig);
{ const r=createSeededRng(1); for(let i=0;i<1000;i++) gen.generateWord({rand:r, mode:'lexicon', morphology:false}); }
const count=50000, passes=5, seed=42;
const results=[];
for (let p=0;p<passes;p++) {
  const rand = createSeededRng(seed + p*1000);
  let attempts=0;
  const t0=performance.now();
  for (let i=0;i<count;i++) {
    const w=gen.generateWord({rand, mode:'lexicon', morphology:false, trace:true});
    attempts += w.trace?.selection?.attemptsExecuted ?? ((w.trace?.attempts??0)+1);
  }
  const ms=performance.now()-t0;
  results.push({wordsPerSec:Math.round(count/ms*1000), attemptsPerWord:+(attempts/count).toFixed(4), ms:Math.round(ms)});
}
const med = (xs) => { const s=[...xs].sort((a,b)=>a-b); return s[Math.floor(s.length/2)]; };
console.log(label, JSON.stringify({
  results,
  medianWps: med(results.map(r=>r.wordsPerSec)),
  medianAttempts: med(results.map(r=>r.attemptsPerWord)),
}));
