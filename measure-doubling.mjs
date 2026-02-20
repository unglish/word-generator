import { createGenerator } from './src/index.js';
const gen = createGenerator({ seed: 42, mode: 'text' });
const N = 50000;
const consonants = new Set('bcdfghjklmnpqrstvwxyz'.split(''));
let artifacts = 0;
let totalTri = 0;
const hits = new Map();
for (let i = 0; i < N; i++) {
  const w = gen.generate().written.toLowerCase();
  for (let j = 0; j <= w.length - 3; j++) {
    totalTri++;
    const t = w.substring(j, j+3);
    if (t[0] === t[1] && consonants.has(t[0]) && consonants.has(t[2]) && t[2] !== t[0]) {
      artifacts++;
      hits.set(t, (hits.get(t)||0)+1);
    }
  }
}
const sorted = [...hits.entries()].sort((a,b) => b[1]-a[1]).slice(0,20);
console.log('Artifacts:', artifacts, '/', totalTri, '=', (artifacts/totalTri*100).toFixed(4)+'%');
console.log('Top:', sorted.map(([k,v]) => k+'('+v+')').join(' '));
