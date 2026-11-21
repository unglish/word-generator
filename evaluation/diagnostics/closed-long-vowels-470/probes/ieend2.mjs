// Word-final consonant + ie + n/l/m/t/r/s (+s) in polysyllables: an unsplit ie read with an extra
// syllable (alien, diet, copier, studies). "ii" = the word has an /i:/ nucleus spelled ie.
import { readFileSync } from "node:fs";
for (const f of process.argv.slice(2)) {
  const L = readFileSync(f, "utf8").trim().split("\n").map(JSON.parse);
  const T = {}; const ex = {};
  for (const r of L) {
    if (r.syl.length < 2) continue;
    const m = r.w.match(/[^aeiouy]ie([nlmtrs])(s?)$/); if (!m) continue;
    const k = m[1] === "s" && !m[2] ? "s" : m[1];
    const ii = r.G.some(g => g.p === "i:" && g.pos === "nucleus" && g.sel === "ie");
    const key = (ii ? "ii " : "any ") + k;
    T[key] = (T[key] ?? 0) + 1; (ex[key] ??= []).length < 6 && ex[key].push(r.w);
    if (ii) { const kk = "ii " + k; }
    if (!ii) continue;
  }
  const sum = (pre, ks) => ks.reduce((a, k) => a + (T[pre + k] ?? 0), 0);
  const nlmt = ["n", "l", "m", "t"], rs = ["r", "s"];
  console.log(f.split("/").pop().padEnd(14), JSON.stringify({ "any nlmt": sum("any ", nlmt) + sum("ii ", nlmt), "any r/s": sum("any ", rs) + sum("ii ", rs), "ii nlmt": sum("ii ", nlmt), "ii r": T["ii r"] ?? 0, "ii s": T["ii s"] ?? 0, "cien|tien": L.filter(r => /[ct]ien/.test(r.w)).length }), JSON.stringify(ex["ii r"] ?? []), JSON.stringify(ex["ii s"] ?? []), JSON.stringify(ex["any s"]??[]));
}
