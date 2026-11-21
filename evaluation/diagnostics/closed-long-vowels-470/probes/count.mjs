import { load, slots } from "./lib.mjs";
for (const f of process.argv.slice(2)) {
  const L = load(f); const c = {}; let w4 = 0, wAll = 0;
  for (const r of L) { const s = slots(r).filter(x => x.issueCase); if (s.length) wAll++; if (s.some(x => x.p !== "əʊ")) w4++; for (const x of s) c[`${x.p}>${x.em}`] = (c[`${x.p}>${x.em}`] ?? 0) + 1; }
  console.log(f.split("/").pop(), JSON.stringify(c), "words4", w4, "wordsAll", wAll);
}
