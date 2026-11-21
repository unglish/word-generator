// Baseline (wtr2 @ 81df038c) vs candidate (w475) on the same seeds, one process.
// Usage: npx tsx compare.ts <N> <firstSeed> [jsonOptions]
import * as A from "<scratch>/wtr2/src/index.ts";
import * as B from "<scratch>/w475/src/index.ts";
const N = Number(process.argv[2] ?? 20000), first = Number(process.argv[3] ?? 2_000_000);
const opts = JSON.parse(process.argv[4] ?? "{}");
const BLOCKED = new Set(["ŋ", "k", "g", "ʃ", "tʃ", "dʒ", "v"]);
const snd = (p: any) => p.sound ?? p;
const surface = (w: any) => w.syllables.map((s: any) => ({ n: s.nucleus.map(snd).join(""), c: s.coda.map(snd), st: s.stress }));
const lexical = (w: any) => w.trace.stages.find((s: any) => s.name === "generatePronunciation").before;
let written = 0, ipaChanged = 0, targeted = 0, shifted = 0, tracedMismatch = 0;
const patterns: Record<string, number> = {}; const ex: Record<string, string[]> = {};
const ing = { A: { ɪ: 0, ə: 0 }, B: { ɪ: 0, ə: 0 } }; const rootIng = { A: { ɪ: 0, ə: 0 }, B: { ɪ: 0, ə: 0 } };
const shiftedEx: string[] = []; const writtenEx: string[] = [];
const tally = (side: "A" | "B", w: any) => {
  const lex = lexical(w), sur = surface(w), isIng = w.trace.morphology?.suffix === "ing";
  const last = sur.length - 1;
  lex.forEach((ls: any, i: number) => {
    if (sur[i].st || ls.nucleus.map(snd).join("") !== "ɪ" || snd(ls.coda[0] ?? "") !== "ŋ") return;
    const v = sur[i].n as "ɪ" | "ə";
    if (isIng && i === last) ing[side][v] = (ing[side][v] ?? 0) + 1;
    else rootIng[side][v] = (rootIng[side][v] ?? 0) + 1;
  });
};
for (let k = 0; k < N; k++) {
  const seed = first + k;
  const a: any = A.generateWord({ ...opts, seed, trace: true });
  const b: any = B.generateWord({ ...opts, seed, trace: true });
  if (k % 10 === 0) { const u: any = B.generateWord({ ...opts, seed }); if (u.pronunciation !== b.pronunciation || u.written.clean !== b.written.clean) tracedMismatch++; }
  tally("A", a); tally("B", b);
  if (a.written.clean !== b.written.clean) { written++; writtenEx.length < 10 && writtenEx.push(`${seed} ${a.written.clean}→${b.written.clean}`); }
  if (a.pronunciation === b.pronunciation) continue;
  ipaChanged++;
  // Targeted: same lexical form, every differing surface syllable is baseline ɪ→ə before a blocked coda kept as ɪ.
  const la = JSON.stringify(lexical(a)), lb = JSON.stringify(lexical(b));
  const sa = surface(a), sb = surface(b), lx = lexical(a);
  let ok = la === lb && sa.length === sb.length && a.written.clean === b.written.clean;
  const diffs: string[] = [];
  if (ok) sa.forEach((s: any, i: number) => {
    const t = sb[i];
    if (JSON.stringify(s) === JSON.stringify(t)) return;
    const lexN = lx[i].nucleus.map(snd).join("");
    if (lexN === "ɪ" && s.n === "ə" && t.n === "ɪ" && BLOCKED.has(s.c[0]) && JSON.stringify(s.c) === JSON.stringify(t.c)) {
      diffs.push(`${i === sa.length - 1 ? "final" : i === 0 ? "initial" : "medial"} ${s.st ? "secondary " : ""}ə${s.c.join("")}→ɪ${t.c.join("")}`);
    } else ok = false;
  });
  // Non-targeted surface diffs could still be aspiration-only; record them separately.
  if (ok && diffs.length) { targeted++; for (const d of diffs) { patterns[d] = (patterns[d] ?? 0) + 1; (ex[d] ??= []).length < 3 && ex[d].push(`${seed} ${b.written.clean} ${a.pronunciation}→${b.pronunciation}`); } }
  else { shifted++; shiftedEx.length < 15 && shiftedEx.push(`${seed} ${a.written.clean} ${a.pronunciation} → ${b.written.clean} ${b.pronunciation}`); }
}
console.log(JSON.stringify({ N, first, opts, writtenChanged: written, ipaChanged, targeted, shifted, tracedMismatch }));
console.log("written examples", writtenEx);
console.log("-ing suffix final rime (lexical ɪŋ, unstressed): before", ing.A, "after", ing.B);
console.log("root lexical ɪŋ (unstressed, not the -ing suffix): before", rootIng.A, "after", rootIng.B);
console.log("targeted patterns:");
for (const [k, n] of Object.entries(patterns).sort((x, y) => y[1] - x[1])) console.log("  " + k.padEnd(28), String(n).padStart(5), " ", ex[k].join(" | "));
console.log("non-targeted examples", shiftedEx);
