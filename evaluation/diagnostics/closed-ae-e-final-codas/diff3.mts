import { readFileSync } from "node:fs";
const A: any = await import("<scratch>/wtr2/src/index.ts"); const B: any = await import("<scratch>/wae2/src/index.ts");
const { scoreSpelling } = await import("<scratch>/wtr2/evaluation/review/wordlikeness/score.ts");
const model = JSON.parse(readFileSync("<scratch>/wtr2/evaluation/review/wordlikeness/artifacts/reference-v1.json", "utf8")).model;
const N = Number(process.argv[2]), first = Number(process.argv[3]);
const same: string[] = [], diff: string[] = []; let sb = 0, sa = 0, better = 0, worse = 0;
for (let i = 0; i < N; i++) { const seed = first + i; const a = A.generateWord({ seed }), b = B.generateWord({ seed });
  if (a.written.clean === b.written.clean && a.pronunciation === b.pronunciation) continue;
  if (a.pronunciation === b.pronunciation) { same.push(`${seed} ${a.written.clean}→${b.written.clean}`); const x = scoreSpelling(a.written.clean, model).normalized!, y = scoreSpelling(b.written.clean, model).normalized!; sa += x; sb += y; if (y > x) better++; else if (y < x) worse++; }
  else diff.push(`${seed} ${a.written.clean}→${b.written.clean}`); }
console.log({ spellingOnly: same.length, differentWord: diff.length, meanBefore: (sa / same.length).toFixed(3), meanAfter: (sb / same.length).toFixed(3), better, worse }); console.log(same.join("\n")); console.log("--"); console.log(diff.join("\n"));
