import { readFileSync } from "node:fs";
import { contexts, contextKey, keyOf } from "<scratch>/w475/evaluation/review/wordlikeness/model.ts";
import { ipaToArpabet } from "<scratch>/w475/src/phonotactic/ipa-to-arpabet.ts";
const model = JSON.parse(readFileSync("<scratch>/w475/evaluation/review/wordlikeness/artifacts/reference-v1.json", "utf8")).model;
const rows = readFileSync(process.argv[2], "utf8").trim().split("\n").map(l => JSON.parse(l));
const gen: Record<string, number> = {};
for (const r of rows) { const syls = r.syl.map((s: any) => ({ onset: s.o.map(ipaToArpabet), nucleus: s.n.map(ipaToArpabet), coda: s.c.map(ipaToArpabet), stressed: s.s !== undefined }));
  syls.forEach((sy: any, i: number) => { for (const p of contexts(i, syls.length, sy.stressed)) if (p.constituent !== "onset") { const k = contextKey(p) + "|" + keyOf([...sy.nucleus, ...sy.coda]); gen[k] = (gen[k] ?? 0) + 1; } }); }
for (const ctx of ["rime:final:unstressed", "rime:medial:unstressed"]) { const b = model.constituents[ctx].counts;
  console.log("\n" + ctx, "coda: CMU IH/(IH+AH)  gen IH/(IH+AH)  (gen n)");
  const codas = new Set<string>(); for (const t of Object.keys(b)) { const m = t.match(/^(IH|AH)( .*)?$/); if (m) codas.add(m[2] ?? ""); }
  const out = [...codas].map(c => { const ci = b["IH" + c] ?? 0, ca = b["AH" + c] ?? 0, gi = gen[ctx + "|IH" + c] ?? 0, ga = gen[ctx + "|AH" + c] ?? 0; return { c: c || " ∅", cmu: ci / (ci + ca), cn: ci + ca, g: gi / (gi + ga || 1), gn: gi + ga }; }).filter(o => o.cn > 200 || o.gn > 100).sort((a, b) => b.cn - a.cn);
  for (const o of out) console.log((o.c).padEnd(10), (o.cmu * 100).toFixed(0).padStart(4) + "% (" + o.cn + ")", (o.g * 100).toFixed(0).padStart(6) + "% (" + o.gn + ")"); }
