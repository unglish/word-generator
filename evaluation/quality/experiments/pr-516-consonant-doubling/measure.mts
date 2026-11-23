// Usage: npx tsx measure.ts <repoRoot> <outPrefix>
const repo = process.argv[2];
const out = process.argv[3];
const { generateWord } = await import(repo + "/src/index.ts");
import { writeFileSync } from "node:fs";
const CHECKED = new Set(["ɪ", "ɛ", "æ", "ʌ", "ʊ"]);
const LOTR = new Set(["ɑ", "ɔ", "ɜ"]);
const DOUBLING_SUFFIXES = new Set(["ing", "ed", "er", "est", "able"]);
const SHAPE = /([^aeiou])([aeiou])([bcdfghlmnprst])$/i;
type Row = { seed: number; word: string; ipa: string; root: string; attached: string; suffix: string; stress: string; nucleus: string; cls: string; doubled: boolean };
const rows: Row[] = [];
let total = 0, mismatch = 0;
for (let i = 0; i < 20000; i++) {
  const seed = 5000000 + i;
  const w = generateWord({ seed, trace: true });
  total++;
  const m = w.trace!.morphology;
  const r = m?.realization;
  const suffix = r?.suffix?.planned?.written;
  if (!r || !suffix || !DOUBLING_SUFFIXES.has(suffix)) continue;
  const lex = w.lexical!;
  const root: string = w.trace!.orthography?.surface ?? "";
  const attached = r.assembledParts.find((p: any) => p.role === "root")!.text;
  if (!(attached === root || attached === root + root.slice(-1))) { mismatch++; if (SHAPE.test(root) && mismatch < 400) console.log("MISMATCH", root, attached, w.written.clean); continue; }
  if (!SHAPE.test(root)) continue;
  const fin = lex.root[lex.root.length - 1];
  const stress = lex.root.length === 1 ? "mono" : fin.stress === "ˈ" ? "primary" : fin.stress === "ˌ" ? "secondary" : "unstressed";
  const nucleus = fin.nucleus.map((p: any) => p.sound).join("");
  const cls = CHECKED.has(nucleus) ? "checked" : LOTR.has(nucleus) ? "lot/r" : nucleus === "ə" ? "schwa" : nucleus === "ɚ" ? "ɚ" : "long";
  rows.push({ seed, word: w.written.clean, ipa: w.pronunciation, root, attached, suffix, stress, nucleus, cls, doubled: attached === root + root.slice(-1) && attached.length > root.length });
}
const key = (r: Row) => `${r.stress.padEnd(10)} ${r.cls.padEnd(7)}`;
const agg: Record<string, [number, number, string[]]> = {};
for (const r of rows) {
  const k = key(r);
  agg[k] ??= [0, 0, []];
  agg[k][0]++;
  if (r.doubled) { agg[k][1]++; if (agg[k][2].length < 6) agg[k][2].push(`${r.word} /${r.ipa}/`); }
}
console.log(`total=${total} eligibleShape=${rows.length} skippedMismatch=${mismatch} doubled=${rows.filter(r => r.doubled).length}`);
for (const [k, [n, d, ex]] of Object.entries(agg).sort()) console.log(`${k} eligible=${String(n).padStart(5)} doubled=${String(d).padStart(5)} (${(100 * d / n).toFixed(1)}%)  ${ex.join(", ")}`);
writeFileSync(out + ".json", JSON.stringify(rows));
