// Extra #470 trade-off counts per 20k (written output): ea /ɛ/-readable shapes, word starts, joins, ei, closed is, oo + k/d,t/r.
import { readFileSync } from "node:fs";
for (const f of process.argv.slice(2)) {
  const L = readFileSync(f, "utf8").trim().split("\n").map(JSON.parse);
  const c = re => L.filter(r => re.test(r.w)).length;
  let ei = 0, eiClosedFirst = 0, isClosed = 0, ooK = 0, ooDT = 0, ooR = 0;
  for (const r of L) for (const g of r.G) {
    if (g.pos !== "nucleus") continue;
    const coda = r.G.filter(h => h.si === g.si && h.pos === "coda").map(h => h.p);
    if (g.p === "i:" && g.sel === "ei") { ei++; if (g.si === 0 && coda.length) eiClosedFirst++; }
    if (g.p === "aɪ" && g.sel === "is" && coda.length) isClosed++;
    if (g.p === "u" && g.sel === "oo" && coda.length) { if (coda[0] === "k") ooK++; if (["d", "t"].includes(coda[0])) ooDT++; if (coda[0] === "r") ooR++; }
  }
  console.log(f.split("/").pop().padEnd(14), JSON.stringify({ eaf: c(/eaf/), eav: c(/eav/), "ea+r+C": c(/ear[^aeiouy]/), "ea+l+C": c(/eal[^aeiouy]/), eath: c(/eath/), ead: c(/ead/), eant: c(/eant/),
    "ie-": c(/^ie/), "oo-": c(/^oo/), "ee-": c(/^ee/), "ea-": c(/^ea/), "ai-": c(/^ai/), eea: c(/eea/), eai: c(/eai/), iin: c(/iin/), ei, eiClosedFirst, isClosed, ooK, ooDT, ooR }));
}
