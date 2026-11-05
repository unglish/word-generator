/**
 * Issue #381 measurement: `ea` before a doubled consonant letter or a vowel letter.
 *
 *   node --import tsx evaluation/quality/experiments/ea-spelling-381/measure.ts [count] [seed]
 *
 * Generates through the public API with `trace: true` and attributes every match
 * to a route using `graphemeSelections`, `orthography` and `morphology` evidence.
 */
import { generateWords } from "../../../../src/index.js";
import type { Word } from "../../../../src/types.js";

const count = Number(process.argv[2] ?? 100000);
const seed = Number(process.argv[3] ?? 7);
const PATTERNS = { doubled: /ea([^aeiou])\1/, vowel: /ea[aeiou]/ } as const;
type PatternName = keyof typeof PATTERNS;

function route(word: Word, name: PatternName): { route: string; detail: string } {
  const trace = word.trace!;
  const root = trace.orthography?.surface ?? "";
  const rootMatch = PATTERNS[name].exec(root);
  if (!rootMatch) {
    const m = trace.morphology;
    const affixes = `${m?.template ?? "?"} ${m?.prefix ?? ""}|${m?.suffix ?? ""}`;
    // Prefix-final e + root-initial a (re+add): two morphemes, not an `ea` grapheme.
    const prefixSide = m?.prefix && /e$/.test(m.prefix) && /^a/.test(root);
    if (prefixSide) return { route: "prefix-e+root-a", detail: `${affixes} root=${root}` };
    const last = trace.orthography?.graphemeUnits.filter(u => u.present).at(-1);
    const eaUnit = last && /ea$/.test(last.selected) && root.endsWith("ea") ? `root-final ${last.selected} grapheme` : "no root-final ea grapheme";
    return { route: `root+suffix (${eaUnit})`, detail: `${affixes} root=${root}` };
  }
  const units = (trace.orthography?.graphemeUnits ?? []).filter(u => u.present && u.start !== null);
  const at = rootMatch.index;
  const owner = units.find(u => u.start! <= at && at < u.end!);
  if (!owner || !owner.selected.startsWith("ea") || owner.start !== at) {
    return { route: "letters-from-separate-graphemes", detail: `${owner?.selected ?? "?"}` };
  }
  // Unit `end` is inclusive.
  const next = units.find(u => u.start === owner.end! + 1);
  const sel = next ? trace.graphemeSelections[next.graphemeSelectionIndex] : undefined;
  if (!next || !sel) return { route: "ea-then-unowned", detail: "" };
  const vowelSel = trace.graphemeSelections[owner.graphemeSelectionIndex];
  const base = `/${owner.phoneme}/ea${vowelSel.selection?.fallback ? "[fallbackOnly]" : ""} + /${sel.phoneme}/ ${sel.position}`;
  if (name === "doubled") {
    if (sel.doubled) return { route: `ea-then-doubling(${sel.position})`, detail: `${base} ${sel.selected}->${sel.emitted}` };
    if (sel.selected.length > 1) return { route: `ea-then-doubled-grapheme(${sel.position})`, detail: `${base} ${sel.selected}` };
    return { route: "ea-then-letter-merge", detail: `${base} ${sel.selected}` };
  }
  return { route: `ea-then-${sel.position}`, detail: `${base} ${sel.selected}` };
}

const words = generateWords(count, { seed, morphology: true, trace: true });
const report: Record<string, unknown> = { count, seed };
for (const name of Object.keys(PATTERNS) as PatternName[]) {
  const routes = new Map<string, { n: number; examples: string[]; details: Map<string, number> }>();
  let total = 0;
  for (const word of words) {
    if (!PATTERNS[name].test(word.written.clean)) continue;
    total++;
    const r = route(word, name);
    const entry = routes.get(r.route) ?? { n: 0, examples: [] as string[], details: new Map<string, number>() };
    entry.n++;
    if (entry.examples.length < 4) entry.examples.push(`${word.written.clean} ${word.pronunciation}`);
    entry.details.set(r.detail, (entry.details.get(r.detail) ?? 0) + 1);
    routes.set(r.route, entry);
  }
  report[name] = {
    total, rate: `${(100 * total / count).toFixed(3)}%`,
    routes: Object.fromEntries([...routes].sort((a, b) => b[1].n - a[1].n).map(([k, v]) => [k, {
      n: v.n, examples: v.examples,
      topDetails: [...v.details].sort((a, b) => b[1] - a[1]).slice(0, 6),
    }])),
  };
}
// Side effects of the fix, from the same trace sample.
let fallbackEe = 0, relaxed = 0, eaThenCk = 0, rootFinalEDropped = 0, rootFinalEaVowelSuffix = 0;
const droppedExamples: string[] = [];
for (const word of words) {
  const trace = word.trace!;
  for (const g of trace.graphemeSelections) {
    if (g.selection?.fallback && g.phoneme === "i:" && g.selected === "ee") fallbackEe++;
    if (g.selection?.preferenceRelaxed === "never-double-after") relaxed++;
  }
  if (/eack/.test(word.written.clean)) eaThenCk++;
  // drop-silent-e removing a letter of the root-final vowel spelling.
  const units = trace.orthography?.graphemeUnits.filter(u => u.present) ?? [];
  const last = units.at(-1);
  const root = trace.orthography?.surface ?? "";
  const suffix = trace.morphology?.suffix;
  if (last && last.position === "nucleus" && suffix && root.endsWith(last.emitted)) {
    if (/ea$/.test(last.emitted) && /^[aeiou]/.test(suffix)) rootFinalEaVowelSuffix++;
    if (/e$/.test(last.emitted) && !word.written.clean.includes(root)) {
      rootFinalEDropped++;
      if (droppedExamples.length < 8) droppedExamples.push(`${root}+${suffix} -> ${word.written.clean} /${last.phoneme}/${last.emitted} ${word.pronunciation}`);
    }
  }
}
report.sideEffects = { fallbackEe, relaxed, eaThenCk, rootFinalEaVowelSuffix, rootFinalEDropped, droppedExamples };
console.log(JSON.stringify(report, null, 2));
