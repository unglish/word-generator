// per-respell-kind trigram delta for targeted words: kind = after form + reason, from the candidate's repair detail
import { readFileSync } from "node:fs";
const W = "<scratch>/wtr2";
const { scoreSpelling } = await import(W + "/evaluation/review/wordlikeness/score.ts");
const model = JSON.parse(readFileSync(W + "/evaluation/review/wordlikeness/artifacts/reference-v1.json", "utf8")).model;
const { generateWord } = await import(process.argv[4]);
const load = (f: string) => new Map(readFileSync(f, "utf8").trim().split("\n").map((l) => JSON.parse(l)).map((r: any) => [r.seed, r]));
const a = load(process.argv[2]), b = load(process.argv[3]);
const agg = new Map<string, number[]>();
for (const [seed, ra] of a) {
  const rb: any = b.get(seed);
  if (ra.w === rb.w || !rb.edits.some((e: string) => e.startsWith("hardLetter:"))) continue;
  const w: any = generateWord({ seed, trace: true });
  const kinds = [...new Set(w.trace.repairs.filter((r: any) => r.rule.startsWith("hardLetter")).map((r: any) => { const n = /before "(.?)"/.exec(r.detail)![1]; return r.detail.replace(/ before .*/, "") + " before " + (/[eiy]/.test(n) ? n : n === "" ? "end" : n === "s" ? "s" : "other"); }))];
  const d = scoreSpelling(rb.w, model).normalized - scoreSpelling(ra.w, model).normalized;
  for (const k of kinds) { const e = agg.get(k as string) ?? []; e.push(d); agg.set(k as string, e); }
}
for (const [k, ds] of [...agg].sort((x, y) => y[1].length - x[1].length)) console.log(k.padEnd(48), String(ds.length).padStart(5), (ds.reduce((s, x) => s + x, 0) / ds.length).toFixed(3), "worse", ds.filter((x) => x < 0).length);
