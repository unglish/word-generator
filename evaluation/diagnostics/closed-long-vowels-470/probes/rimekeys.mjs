import { readFileSync } from "node:fs";
import { rimes } from "../review-AF/rimes.mjs";
const keys = process.argv[2].split(",");
for (const f of process.argv.slice(3)) {
  const L = readFileSync(f, "utf8").trim().split("\n").map(l => JSON.parse(l));
  const t = {}, ex = {};
  const key = x => `${x.sound}:${x.nuc}${x.split ? "_e" : ""}${x.unowned ? "+E" : ""}|${x.coda}`;
  for (const r of L) for (const x of rimes(r)) { const k = key(x); if (keys.includes(k)) { t[k] = (t[k] ?? 0) + 1; (ex[k] ??= []).length < 6 && ex[k].push(r.w); } }
  console.log(f.split("/").pop(), JSON.stringify(t), JSON.stringify(ex));
}
