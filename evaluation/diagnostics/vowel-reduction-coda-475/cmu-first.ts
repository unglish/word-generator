import { readFileSync } from "node:fs";
const model = JSON.parse(readFileSync(process.argv[2], "utf8")).model;
for (const ctx of ["rime:final:unstressed", "rime:medial:unstressed", "rime:initial:unstressed"]) {
  const b = model.constituents[ctx]?.counts; if (!b) { console.log("no", ctx); continue; }
  const agg: Record<string, [number, number]> = {};
  for (const [t, n] of Object.entries<number>(b)) { const m = t.match(/^(IH|AH)(?: (\S+))?/); if (!m) continue; const f = m[2] ?? "∅"; agg[f] ??= [0, 0]; agg[f][m[1] === "IH" ? 0 : 1] += n; }
  console.log("\n" + ctx + " by FIRST coda consonant: IH share (n)");
  for (const [f, [i, a]] of Object.entries(agg).sort((x, y) => (y[1][0] + y[1][1]) - (x[1][0] + x[1][1]))) if (i + a > 30) console.log(f.padEnd(4), (100 * i / (i + a)).toFixed(0).padStart(4) + "%", i + a);
}
