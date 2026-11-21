// usage: tsx score-diff.mts base.jsonl cand.jsonl diff.json — CMU letter-trigram before/after
import { readFileSync } from "node:fs";
const W = "<scratch>/wtr2";
const { scoreSpelling } = await import(`${W}/evaluation/review/wordlikeness/score.ts`);
const model = JSON.parse(readFileSync(`${W}/evaluation/review/wordlikeness/artifacts/reference-v1.json`, "utf8")).model;
const load = (p: string) => new Map(readFileSync(p, "utf8").trim().split("\n").map(l => JSON.parse(l)).map((r: any) => [r.seed, r]));
const [a, b, d] = process.argv.slice(2);
const A = load(a), B = load(b), D = JSON.parse(readFileSync(d, "utf8"));
const sc = (w: string) => scoreSpelling(w, model).normalized as number;
const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
const all = [...A.values()].map((r: any) => sc(r.w)), allB = [...B.values()].map((r: any) => sc(r.w));
console.log(`all 20k: ${mean(all).toFixed(4)} -> ${mean(allB).toFixed(4)}`);
for (const key of ["changed", "targeted", "other"]) {
  const seeds: number[] = D[key]; if (!seeds.length) continue;
  const x = seeds.map(s => sc(A.get(s).w)), y = seeds.map(s => sc(B.get(s).w));
  const better = seeds.filter((_, i) => y[i] > x[i]).length, worse = seeds.filter((_, i) => y[i] < x[i]).length;
  console.log(`${key} n=${seeds.length}: ${mean(x).toFixed(4)} -> ${mean(y).toFixed(4)}  better ${better} worse ${worse}`);
}
