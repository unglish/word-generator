import { readFileSync } from "node:fs";
const L = f => readFileSync(f, "utf8").trim().split("\n").map(JSON.parse);
for (const f of ["stack", "cand", "proto"]) {
  const T = {}, ex = {};
  for (const r of L(f + ".jsonl")) {
    const w = r.w; const syl = r.pron.split(" . ").length;
    if (syl < 2) continue;
    // word-final consonant + ie + X (+s), polysyllable
    const m = w.match(/[^aeiouy]ie(r|s|n|l|m|t|d)(s?)$/);
    const mm = w.match(/[^aeiouy]ie(r)(e[rd]|al|ing|y)s?$/);
    // only count if an /i:/ nucleus exists spelled ie (avoid /aɪ/ ie+r like 'fier')
    const hasIe = r.phones.some((p, id) => p[1] === "nucleus" && p[2] === "i:" && r.cells.filter(c => c[1] === id).map(c => c[0]).join("") === "ie");
    if (!hasIe) continue;
    if (m) { const k = "final -ie" + m[1] + (m[2] ? "s" : ""); T[k] = (T[k] ?? 0) + 1; (ex[k] ??= []).push(w); }
    if (mm) { const k = "-ier+" + mm[2]; T[k] = (T[k] ?? 0) + 1; (ex[k] ??= []).push(w); }
  }
  console.log("==", f); for (const k of Object.keys(T).sort()) console.log(" ", T[k], k, ex[k].slice(0, 8).join(" "));
}
