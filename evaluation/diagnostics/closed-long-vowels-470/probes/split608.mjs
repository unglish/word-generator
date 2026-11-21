import { readFileSync } from "node:fs"; process.chdir("<scratch>/runs/p470/review-AF");
const load = f => readFileSync(f, "utf8").trim().split("\n").map(l => JSON.parse(l));
const [S, C] = [load("stack.jsonl"), load("../r6/head-af.jsonl")];
const ownedText = (r, id) => r.cells.filter(c => c[1] === id).map(c => c[0]).join("");
function form(r, id) {
  const idx = r.cells.map((c, i) => [c, i]).filter(([c]) => c[1] === id).map(([, i]) => i);
  const t = idx.map(i => r.cells[i][0]).join("");
  const last = idx[idx.length - 1];
  // find coda end of this syllable
  const syl = r.phones[id][0];
  let k = last + 1; while (k < r.cells.length && r.cells[k][1] >= 0 && r.phones[r.cells[k][1]][0] === syl && r.phones[r.cells[k][1]][1] === "coda") k++;
  const marker = k < r.cells.length && r.cells[k][1] < 0 && r.cells[k][0] === "e";
  return marker ? t + "_e(silent)" : t;
}
let total = 0, samePron = 0; const T = {}, ex = {};
let wordsSplit = 0;
for (let i = 0; i < S.length; i++) {
  const s = S[i], c = C[i];
  let hit = false;
  s.phones.forEach((p, id) => {
    if (p[1] !== "nucleus" || p[2] !== "i:") return;
    const t = ownedText(s, id);
    if (!/^i[^aeiouy]+e$/.test(t)) return;
    hit = true; total++;
    if (s.pron !== c.pron) return;
    samePron++;
    const f = form(c, id).replace(/^ie.*/, "ie").replace(/^i[^aeiouy]+e$/, "i_e");
    T[f] = (T[f] ?? 0) + 1; (ex[f] ??= []).push(`${s.w}→${c.w}`);
  });
  if (hit) wordsSplit++;
}
console.log({ slots: total, words: wordsSplit, samePron });
for (const [k, v] of Object.entries(T).sort((a, b) => b[1] - a[1])) console.log(v, k, ex[k].slice(0, 10).join(" "));
