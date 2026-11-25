import { readFileSync } from "node:fs";
const rows = process.argv.slice(2).flatMap(f => readFileSync(f, "utf8").trim().split("\n").map(JSON.parse));
const pairs = Object.keys(rows[0].expected);
const pinned = rows.find(r => r.seed === 20261123);
const sample = rows.filter(r => r.seed !== 20261123);
console.log(`seeds=${sample.length}`);
console.log("pair   E      floor  ceil   mean   sd    min  max  ratio  z(floor) fails pinned");
for (const p of pairs) {
  const xs = sample.map(r => r.observed[p] ?? 0);
  const es = sample.map(r => r.expected[p]);
  const m = xs.reduce((a, b) => a + b) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
  const E = es.reduce((a, b) => a + b) / es.length;
  const floor = Math.max(1, E / 2 - 3), ceil = E * 2 + 3;
  const fails = sample.filter(r => { const c = r.observed[p] ?? 0, e = r.expected[p]; return c < Math.max(1, e / 2 - 3) || c > e * 2 + 3; }).length;
  console.log([p.padEnd(6), E.toFixed(1).padStart(5), floor.toFixed(1).padStart(6), ceil.toFixed(1).padStart(6), m.toFixed(1).padStart(6), sd.toFixed(1).padStart(5), String(Math.min(...xs)).padStart(4), String(Math.max(...xs)).padStart(4), (m / E).toFixed(2).padStart(6), ((m - floor) / sd).toFixed(1).padStart(8), String(fails).padStart(5), String(pinned?.observed[p] ?? "-").padStart(6)].join(" "));
}
