// The 608 stack /i:/ ie -> i_e slots: written outcome at head (same phonology) x trace selection at head.
import { readFileSync } from "node:fs";
const D = "<scratch>/runs/p470/";
const load = f => readFileSync(D + f, "utf8").trim().split("\n").map(l => JSON.parse(l));
const [S, C, G] = [load("review-AF/stack.jsonl"), load(process.argv[2] ?? "r6/head-af.jsonl"), load(process.argv[3] ?? "new21.jsonl")];
const own = (r, id) => r.cells.filter(c => c[1] === id).map(c => c[0]).join("");
function form(r, id) {
  const idx = r.cells.map((c, i) => [c, i]).filter(([c]) => c[1] === id).map(([, i]) => i);
  const t = idx.map(i => r.cells[i][0]).join(""); const last = idx[idx.length - 1]; const syl = r.phones[id][0];
  let k = last + 1; while (k < r.cells.length && r.cells[k][1] >= 0 && r.phones[r.cells[k][1]][0] === syl && r.phones[r.cells[k][1]][1] === "coda") k++;
  const marker = k < r.cells.length && r.cells[k][1] < 0 && r.cells[k][0] === "e";
  return (marker ? t + "_e" : t).replace(/^ie.*/, "ie").replace(/^i[^aeiouy]+e$/, "i_e");
}
const T = {}, ex = {}; let same = 0, slots = 0;
for (let i = 0; i < S.length; i++) {
  const s = S[i], c = C[i];
  s.phones.forEach((p, id) => {
    if (p[1] !== "nucleus" || p[2] !== "i:" || !/^i[^aeiouy]+e$/.test(own(s, id))) return;
    slots++; if (s.pron !== c.pron) return; same++;
    const sel = G[i].G.find(g => g.pos === "nucleus" && g.p === "i:" && g.si === p[0])?.sel;
    const k = `${form(c, id)} (selected ${sel})`; T[k] = (T[k] ?? 0) + 1; (ex[k] ??= []).length < 4 && ex[k].push(c.w);
  });
}
console.log({ slots, same }); for (const [k, v] of Object.entries(T).sort((a, b) => b[1] - a[1])) console.log(v, k, ex[k].join(" "));
