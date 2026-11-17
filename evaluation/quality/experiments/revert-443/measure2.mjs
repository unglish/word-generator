import { pathToFileURL } from 'node:url';

const root = process.argv[2];
const label = process.argv[3] || 'branch';
const { createGenerator, englishConfig, createSeededRng } = await import(pathToFileURL(root + '/src/index.ts').href);

function phonemeCount(word) {
  return word.syllables.reduce((s, syl) => s + syl.onset.length + syl.nucleus.length + syl.coda.length, 0);
}

function emptyAcc() {
  return { n:0, mono:0, two:0, m3:0, m4:0, m5:0, t6:0 };
}

function addWord(acc, w) {
  acc.n++;
  const syl = w.syllables.length;
  const ph = phonemeCount(w);
  if (syl===1) { acc.mono++; if(ph===3)acc.m3++; else if(ph===4)acc.m4++; else if(ph===5)acc.m5++; }
  else if (syl===2) { acc.two++; if(ph===6)acc.t6++; }
}

function merge(a,b) {
  for (const k of Object.keys(a)) a[k]+=b[k];
  return a;
}

function pct(acc) {
  return {
    n: acc.n, mono: acc.mono, two: acc.two,
    monoShare: +(100*acc.mono/acc.n).toFixed(3),
    twoSylShare: +(100*acc.two/acc.n).toFixed(3),
    monoPhones3: acc.mono?+(100*acc.m3/acc.mono).toFixed(3):0,
    monoPhones4: acc.mono?+(100*acc.m4/acc.mono).toFixed(3):0,
    monoPhones5: acc.mono?+(100*acc.m5/acc.mono).toFixed(3):0,
    twoSylPhones6: acc.two?+(100*acc.t6/acc.two).toFixed(3):0,
  };
}

function sampleAcc(seed, count, opts={}) {
  const gen = createGenerator(englishConfig);
  const rand = createSeededRng(seed);
  const acc = emptyAcc();
  for (let i=0;i<count;i++) addWord(acc, gen.generateWord({ rand, mode:'lexicon', morphology:false, ...opts }));
  return acc;
}

const SEEDS = [42,43,44];
const N = Number(process.env.N || 200000);
console.log('=== ' + label + ' N=' + N + ' per seed ===');
const pooled = emptyAcc();
for (const seed of SEEDS) {
  const acc = sampleAcc(seed, N);
  merge(pooled, acc);
  console.log(JSON.stringify({ seed, ...pct(acc) }));
}
console.log(JSON.stringify({ seed:'pooled', ...pct(pooled) }));

for (const syl of [1,2]) {
  const gen = createGenerator(englishConfig);
  const rand = createSeededRng(1301 + syl);
  const hist = {};
  let sum=0, n=20000;
  for (let i=0;i<n;i++) {
    const w = gen.generateWord({ rand, mode:'lexicon', morphology:false, syllableCount: syl });
    const ph = phonemeCount(w);
    hist[ph]=(hist[ph]||0)+1;
    sum += ph;
  }
  const shares = Object.fromEntries(Object.entries(hist).sort((a,b)=>Number(a[0])-Number(b[0])).map(([k,v])=>[k, +(100*v/n).toFixed(2)]));
  console.log(JSON.stringify({ forcedSyllables: syl, meanPhones: +(sum/n).toFixed(4), shares }));
}

function measurePerf(count=50000, seed=42, passes=3) {
  const gen = createGenerator(englishConfig);
  // warmup
  { const r=createSeededRng(1); for(let i=0;i<500;i++) gen.generateWord({rand:r, mode:'lexicon', morphology:false}); }
  const results=[];
  for (let p=0;p<passes;p++) {
    const rand = createSeededRng(seed + p*1000);
    let attempts = 0;
    const t0 = performance.now();
    for (let i=0;i<count;i++) {
      const w = gen.generateWord({ rand, mode:'lexicon', morphology:false, trace:true });
      attempts += w.trace?.selection?.attemptsExecuted ?? ((w.trace?.attempts ?? 0) + 1);
    }
    const ms = performance.now() - t0;
    results.push({ wordsPerSec: Math.round(count/ms*1000), attemptsPerWord: +(attempts/count).toFixed(4), ms: Math.round(ms) });
  }
  return results;
}
console.log('perf', JSON.stringify(measurePerf()));
