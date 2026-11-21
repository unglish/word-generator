const A: any = await import("<scratch>/runs/p469/base-b372-1795262730/src/index.ts"); const B: any = await import("<scratch>/w469/src/index.ts");
let d = 0;
for (const o of [{}, { mode: "text" }, { morphology: false }]) for (let i = 0; i < (Object.keys(o).length ? 5000 : 20000); i++) {
  const s = 2_000_000 + i; const a = A.generateWord({ ...o, seed: s }), b = B.generateWord({ ...o, seed: s });
  if (a.written.clean !== b.written.clean || a.pronunciation !== b.pronunciation || a.written.hyphenated !== b.written.hyphenated) d++; }
console.log("diffs", d);
const t = (G: any) => { const t0 = performance.now(); G.generateWords(20000, { seed: 7 }); return performance.now() - t0; };
const ra: number[] = [], rb: number[] = []; t(A); t(B);
for (let r = 0; r < 6; r++) { if (r % 2) { rb.push(t(B)); ra.push(t(A)); } else { ra.push(t(A)); rb.push(t(B)); } }
const med = (x: number[]) => x.sort((p, q) => p - q)[3]; console.log("ms before", med(ra).toFixed(0), "after", med(rb).toFixed(0), "ratio", (med(rb) / med(ra)).toFixed(3));
