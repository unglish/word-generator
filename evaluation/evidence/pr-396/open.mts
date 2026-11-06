// Open checked-vowel and FOOT rates: forced monosyllables vs automatic monosyllables, plus CMU.
import { readFileSync } from "node:fs";
const [root, dict] = process.argv.slice(2);
const api = await import(`${root}/src/index.ts`);
const LAX = new Set(["ɪ", "ɛ", "æ", "ʌ", "ʊ"]);
function rates(words: any[]) {
  const n = words.length;
  const open = words.filter(w => { const s = w.syllables.at(-1); return s.coda.length === 0 && s.nucleus.length === 1 && LAX.has(s.nucleus[0].sound); });
  const foot = words.filter(w => w.syllables.some((s: any) => s.nucleus.some((p: any) => p.sound === "ʊ")));
  const ex: Record<string, number> = {};
  for (const w of open) { const v = w.syllables.at(-1).nucleus[0].sound; ex[v] = (ex[v] ?? 0) + 1; }
  return { n, openChecked: (100 * open.length / n).toFixed(2) + "%", byVowel: ex, foot: (100 * foot.length / n).toFixed(2) + "%", examples: open.slice(0, 8).map(w => w.written.clean) };
}
const forced = api.generateWords(50000, { seed: 77, mode: "lexicon", morphology: false, syllableCount: 1 });
const auto = api.generateWords(200000, { seed: 78, mode: "lexicon", morphology: false }).filter((w: any) => w.syllables.length === 1);
console.log("forced", JSON.stringify(rates(forced)));
console.log("auto  ", JSON.stringify(rates(auto)));
// CMU single-vowel words ending in a lax vowel (IH EH AE AH-stressed UH)
let total = 0, open = 0, foot = 0; const seen = new Set<string>();
const V = new Set("AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW".split(" "));
for (const line of readFileSync(dict, "utf8").split("\n")) {
  const [h, ...r] = line.split("#")[0].trim().split(/\s+/);
  if (!h || /\(\d\)$/.test(h) || !/^[a-z]+$/.test(h) || seen.has(h)) continue; seen.add(h);
  const v = r.filter(p => V.has(p.replace(/\d/, "")));
  if (v.length !== 1) continue; total++;
  const last = r.at(-1)!;
  if (/^(IH|EH|AE|UH)\d$/.test(last) || last === "AH1") open++;
  if (r.some(p => p.startsWith("UH"))) foot++;
}
console.log("cmu   ", { n: total, openChecked: (100 * open / total).toFixed(2) + "%", foot: (100 * foot / total).toFixed(2) + "%" });
