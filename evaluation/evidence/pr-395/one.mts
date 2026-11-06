const [root, seed] = process.argv.slice(2);
const api = await import(`${root}/src/index.ts`);
const w = api.generateWord({ mode: "lexicon", morphology: false, syllableCount: 1, seed: Number(seed), trace: true });
console.log(w.written.clean);
for (const g of w.trace.graphemeSelections ?? []) console.log(" sel", g.phoneme, g.position, "->", g.selected ?? g.grapheme ?? g.form, JSON.stringify(g.candidates?.map((c: any) => c.form ?? c[0]) ?? g.pool?.map?.((c: any) => c.form)).slice(0, 200));
for (const b of w.trace.spellingBudgets ?? []) console.log(" budget", b.scope, b.status, b.reason ?? "", JSON.stringify(b.before.exceeded), "->", JSON.stringify(b.after.exceeded), "visited", b.visitedAssignments, "legal", b.legalOptions, JSON.stringify(b.refusals ?? {}));
const edits = w.trace.baseSpelling?.edits ?? [];
for (const e of edits) console.log(" edit", e.rule, e.before, "->", e.after);
