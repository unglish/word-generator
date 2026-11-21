// /aɪ/ written as a bare i before a coda of one non-held consonant + s/z (times-type), unsplit (AF dump format).
import { readFileSync } from "node:fs";
const H = new Set(["ŋ", "ʃ", "tʃ", "θ", "ð"]);
for (const f of process.argv.slice(2)) {
  const L = readFileSync(f, "utf8").trim().split("\n").map(l => JSON.parse(l));
  let n = 0, fin = 0; const ex = [];
  for (const r of L) {
    const last = Math.max(...r.phones.map(p => p[0]));
    r.phones.forEach((p, id) => {
      if (p[1] !== "nucleus" || p[2] !== "aɪ") return;
      const own = r.cells.filter(c => c[1] === id).map(c => c[0]).join(""); if (own !== "i") return;
      const coda = r.phones.map((q, k) => [q, k]).filter(([q]) => q[0] === p[0] && q[1] === "coda");
      if (coda.length !== 2 || H.has(coda[0][0][2]) || !["s", "z"].includes(coda[1][0][2])) return;
      const lastIdx = Math.max(...r.cells.map((c, i) => c[1] === coda[1][1] ? i : -1));
      const after = r.cells[lastIdx + 1]; if (after && after[0] === "e" && after[1] < 0) return;
      n++; if (p[0] === last) fin++; ex.length < 6 && ex.push(r.w);
    });
  }
  console.log(f.split("/").pop(), n, "final-syllable", fin, ex.join(" "));
}
