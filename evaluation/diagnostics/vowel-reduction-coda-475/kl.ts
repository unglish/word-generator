// Sound-model comparison: KL(gen || CMU) per constituent context (over.ts smoothing), before vs after,
// plus the mean per-word sound log-probability for changed words.
import { readFileSync } from "node:fs";
import { contexts, contextKey, keyOf } from "<scratch>/wtr2/evaluation/review/wordlikeness/model.ts";
import { ipaToArpabet } from "<scratch>/wtr2/src/phonotactic/ipa-to-arpabet.ts";
const model = JSON.parse(readFileSync("<scratch>/wtr2/evaluation/review/wordlikeness/artifacts/reference-v1.json", "utf8")).model;
const load = (f: string) => readFileSync(f, "utf8").trim().split("\n").map(l => JSON.parse(l));
const toks = (r: any) => { const syls = r.syl.map((s: any) => ({ onset: s.o.map(ipaToArpabet), nucleus: s.n.map(ipaToArpabet), coda: s.c.map(ipaToArpabet), stressed: s.s !== undefined }));
  const out: [string, string][] = []; syls.forEach((sy: any, i: number) => { for (const p of contexts(i, syls.length, sy.stressed)) out.push([contextKey(p), keyOf(p.constituent === "onset" ? sy.onset : [...sy.nucleus, ...sy.coda])]); }); return out; };
const kl = (rows: any[]) => { const gen: Record<string, Record<string, number>> = {}, gt: Record<string, number> = {};
  for (const r of rows) for (const [c, t] of toks(r)) { (gen[c] ??= {})[t] = (gen[c][t] ?? 0) + 1; gt[c] = (gt[c] ?? 0) + 1; }
  const res: Record<string, number> = {}; for (const c in gen) { const b = model.constituents[c]; if (!b) continue; let s = 0; for (const t in gen[c]) { const g = gen[c][t] / gt[c]; const m = ((b.counts[t] ?? 0) + 0.5) / b.total; s += g * Math.log(g / m); } res[c] = s; } return res; };
const lp = (r: any) => toks(r).reduce((s, [c, t]) => { const b = model.constituents[c]; return b ? s + Math.log(((b.counts[t] ?? 0) + 0.5) / b.total) : s; }, 0);
const A = load(process.argv[2]), B = load(process.argv[3]);
const ka = kl(A), kb = kl(B);
console.log("| context | KL before | KL after |\n|---|---:|---:|"); for (const c of Object.keys(ka).sort()) console.log(`| ${c} | ${ka[c].toFixed(4)} | ${kb[c].toFixed(4)} |`);
let n = 0, better = 0, worse = 0, sa = 0, sb = 0;
for (let i = 0; i < A.length; i++) { if (A[i].ipa === B[i].ipa) continue; n++; const a = lp(A[i]), b = lp(B[i]); sa += a; sb += b; if (b > a + 1e-9) better++; else if (b < a - 1e-9) worse++; }
console.log(`changed words ${n}: mean sound log-prob ${(sa / n).toFixed(3)} → ${(sb / n).toFixed(3)}; better ${better}, worse ${worse}, same ${n - better - worse}`);
for (let i = 0; i < A.length; i++) { if (A[i].ipa === B[i].ipa) continue; const a = lp(A[i]), b = lp(B[i]); if (b < a - 1e-9) console.log("worse", A[i].seed, A[i].w, A[i].ipa, "→", B[i].ipa, (b - a).toFixed(2)); }
