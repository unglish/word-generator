// ih.ts with two dumps side by side: CMU /ɪ/ share vs before vs after, per unstressed rime coda.
import { readFileSync } from "node:fs";
import { contexts, contextKey, keyOf } from "<scratch>/wtr2/evaluation/review/wordlikeness/model.ts";
import { ipaToArpabet } from "<scratch>/wtr2/src/phonotactic/ipa-to-arpabet.ts";
const model = JSON.parse(readFileSync("<scratch>/wtr2/evaluation/review/wordlikeness/artifacts/reference-v1.json", "utf8")).model;
const count = (file: string) => { const gen: Record<string, number> = {};
  for (const l of readFileSync(file, "utf8").trim().split("\n")) { const r = JSON.parse(l);
    const syls = r.syl.map((s: any) => ({ onset: s.o.map(ipaToArpabet), nucleus: s.n.map(ipaToArpabet), coda: s.c.map(ipaToArpabet), stressed: s.s !== undefined }));
    syls.forEach((sy: any, i: number) => { for (const p of contexts(i, syls.length, sy.stressed)) if (p.constituent !== "onset") { const k = contextKey(p) + "|" + keyOf([...sy.nucleus, ...sy.coda]); gen[k] = (gen[k] ?? 0) + 1; } }); }
  return gen; };
const A = count(process.argv[2]), B = count(process.argv[3]);
const pct = (i: number, a: number) => i + a ? (100 * i / (i + a)).toFixed(0) + "%" : "-";
for (const ctx of ["rime:final:unstressed", "rime:medial:unstressed"]) { const b = model.constituents[ctx].counts;
  console.log(`\n${ctx}\n| coda | CMU /ɪ/ share (n) | before (n) | after (n) | |CMU−before| → |CMU−after| |\n|---|---:|---:|---:|---|`);
  const codas = new Set<string>(); for (const t of Object.keys(b)) { const m = t.match(/^(IH|AH)( .*)?$/); if (m) codas.add(m[2] ?? ""); }
  const rows = [...codas].map(c => { const ci = b["IH" + c] ?? 0, ca = b["AH" + c] ?? 0;
    const ai = A[ctx + "|IH" + c] ?? 0, aa = A[ctx + "|AH" + c] ?? 0, bi = B[ctx + "|IH" + c] ?? 0, ba = B[ctx + "|AH" + c] ?? 0;
    return { c: c.trim() || "∅", ci, ca, ai, aa, bi, ba }; }).filter(o => o.ci + o.ca > 200 || o.ai + o.aa > 100).sort((x, y) => (y.ci + y.ca) - (x.ci + x.ca));
  for (const o of rows) { const cmu = o.ci / (o.ci + o.ca), ga = o.ai / (o.ai + o.aa || 1), gb = o.bi / (o.bi + o.ba || 1);
    const moved = o.ai !== o.bi || o.aa !== o.ba;
    console.log(`| ${o.c} | ${pct(o.ci, o.ca)} (${o.ci + o.ca}) | ${pct(o.ai, o.aa)} (${o.ai + o.aa}) | ${pct(o.bi, o.ba)} (${o.bi + o.ba}) | ${moved ? `${(100 * Math.abs(cmu - ga)).toFixed(0)} → ${(100 * Math.abs(cmu - gb)).toFixed(0)}` : "unchanged"} |`); } }
