// usage: score.mts <before.jsonl> <after.jsonl>
import { readFileSync } from "node:fs";
const W = "<scratch>/wtr2";
const { scoreSpelling } = await import(W + "/evaluation/review/wordlikeness/score.ts");
const model = JSON.parse(readFileSync(W + "/evaluation/review/wordlikeness/artifacts/reference-v1.json", "utf8")).model;
const load = (f: string) => new Map(readFileSync(f, "utf8").trim().split("\n").map((l) => JSON.parse(l)).map((r: any) => [r.seed, r]));
const a = load(process.argv[2]), b = load(process.argv[3]);
const phones = (r: any) => JSON.stringify([r.G.split(" ").map((g: string) => g.split(">")[0]), r.m, r.sfx]);
const groups: Record<string, [number, number][]> = { changed: [], targeted: [], shifted: [] };
for (const [seed, ra] of a) {
  const rb: any = b.get(seed);
  if (ra.w === rb.w) continue;
  const pair: [number, number] = [scoreSpelling(ra.w, model).normalized, scoreSpelling(rb.w, model).normalized];
  groups.changed.push(pair);
  const targeted = rb.edits.some((e: string) => e.startsWith("hardLetter:")) && phones(ra) === phones(rb);
  groups[targeted ? "targeted" : "shifted"].push(pair);
}
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
for (const [name, ps] of Object.entries(groups)) {
  const better = ps.filter(([x, y]) => y > x).length, worse = ps.filter(([x, y]) => y < x).length;
  console.log(`${name.padEnd(9)} n=${ps.length} before ${mean(ps.map((p) => p[0])).toFixed(4)} after ${mean(ps.map((p) => p[1])).toFixed(4)} delta ${(mean(ps.map((p) => p[1] - p[0]))).toFixed(4)} better ${better} worse ${worse} same ${ps.length - better - worse}`);
}
