import { readFileSync } from "node:fs";
const rows = process.argv.slice(3).flatMap(f => readFileSync(f, "utf8").trim().split("\n").map(JSON.parse));
const z = Number(process.argv[2]);
const band = e => [e / 2 - z * Math.sqrt(e / 2), e * 2 + z * Math.sqrt(e * 2)];
const pairs = Object.keys(rows[0].expected);
let anyFail = 0;
for (const r of rows) if (pairs.some(p => { const c = r.observed[p] ?? 0, [lo, hi] = band(r.expected[p]); return c < lo || c > hi; })) anyFail++;
console.log(`z=${z} seeds=${rows.length} seeds failing any pair=${anyFail}`);
for (const p of pairs) {
  const xs = rows.map(r => r.observed[p] ?? 0), es = rows.map(r => r.expected[p]);
  const m = xs.reduce((a, b) => a + b) / xs.length, sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
  const E = es.reduce((a, b) => a + b) / es.length, [lo, hi] = band(E);
  const fails = rows.filter(r => { const c = r.observed[p] ?? 0, [l, h] = band(r.expected[p]); return c < l || c > h; }).length;
  console.log(`${p.padEnd(6)} E=${E.toFixed(1).padStart(6)} band=[${lo.toFixed(1)}, ${hi.toFixed(1)}] (${(lo / E * 100).toFixed(0)}%–${(hi / E * 100).toFixed(0)}% of English) mean=${m.toFixed(1)} sd=${sd.toFixed(1)} min=${Math.min(...xs)} max=${Math.max(...xs)} σ-to-floor=${((m - lo) / sd).toFixed(1)} σ-to-ceil=${((hi - m) / sd).toFixed(1)} fails=${fails}`);
}
