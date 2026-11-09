const { generateWords } = await import("/Users/ryanbetts/.t3/worktrees/word-generator/t3-cc1ba2f2/dist/index.js");
const stats = {};
function run(prune, seedBase) {
  globalThis.__PRUNE = prune;
  const L = new Map(), P = new Map(), S = new Map(), B = new Map(); let n = 0, uniq = new Set();
  for (const [mode, morphology] of [["lexicon",true],["lexicon",false],["text",true],["text",false]])
    for (let k = 0; k < 5; k++) for (const w of generateWords(10000, { seed: seedBase + k, mode, morphology })) {
      n++; const c = w.written.clean; uniq.add(c);
      L.set(c.length, (L.get(c.length) ?? 0) + 1);
      const ph = w.syllables.reduce((a, s) => a + s.onset.length + s.nucleus.length + s.coda.length, 0);
      P.set(ph, (P.get(ph) ?? 0) + 1); S.set(w.syllables.length, (S.get(w.syllables.length) ?? 0) + 1);
      for (let i = 0; i + 1 < c.length; i++) { const b = c.slice(i, i + 2); B.set(b, (B.get(b) ?? 0) + 1); }
    }
  return { n, L, P, S, B, uniq: uniq.size };
}
const mean = m => { let s = 0, c = 0; for (const [k, v] of m) { s += k * v; c += v; } return s / c; };
// total variation distance between two count maps
const tvd = (a, b) => { const na = [...a.values()].reduce((x, y) => x + y), nb = [...b.values()].reduce((x, y) => x + y); let d = 0; for (const k of new Set([...a.keys(), ...b.keys()])) d += Math.abs((a.get(k) ?? 0) / na - (b.get(k) ?? 0) / nb); return d / 2; };
const off = run(false, 1000), off2 = run(false, 5000), on = run(true, 1000);
for (const [name, k] of [["letters","L"],["phonemes","P"],["syllables","S"],["bigrams","B"]]) {
  const line = [name.padEnd(9), "TVD off-vs-on", tvd(off[k], on[k]).toFixed(4), " noise off-vs-off(other seeds)", tvd(off[k], off2[k]).toFixed(4)];
  if (k !== "B") line.push(" mean off", mean(off[k]).toFixed(3), "on", mean(on[k]).toFixed(3), "off2", mean(off2[k]).toFixed(3));
  console.log(line.join(" "));
}
console.log("unique spellings off", off.uniq, "on", on.uniq, "off2", off2.uniq);
