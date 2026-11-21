// Silent-e swaps on the stack base: a long-vowel digraph selection (trace graphemeSelections) written
// as one letter + coda cluster/held consonant + unowned e. Prints the same seed at the head.
const [stackRoot, headRoot] = process.argv.slice(2);
const A = await import(`${stackRoot}/src/index.ts`), B = await import(`${headRoot}/src/index.ts`);
const LONG = new Set(["aɪ", "eɪ", "i:", "u"]); const HELD = new Set(["ŋ", "ʃ", "tʃ", "θ", "ð"]);
let n = 0;
for (let seed = 2_000_000; seed < 2_008_000; seed++) {
  const w: any = A.generateWord({ seed, trace: true }); const b = w.trace.baseSpelling; if (!b) continue;
  const owner = (c: any) => c.origin.kind === "rewrite" ? (c.origin.sourceUnitIds[0] ?? -1) : c.origin.unitId;
  for (const nuc of b.phones) {
    if (nuc.segment !== "nucleus" || !LONG.has(nuc.soundAtSpelling)) continue;
    const sel = w.trace.graphemeSelections.find((g: any) => g.index === nuc.id);
    if (!sel || sel.selected.length < 2 || !["u","eɪ"].includes(nuc.soundAtSpelling)) continue;
    const coda = b.phones.filter((p: any) => p.syllableIndex === nuc.syllableIndex && p.segment === "coda");
    if (!(coda.length > 1 || (coda.length === 1 && HELD.has(coda[0].soundAtSpelling)))) continue;
    const nucCells = b.cells.map((c: any, i: number) => [c, i]).filter(([c]: any) => owner(c) === nuc.id);
    const codaIdx = b.cells.map((c: any, i: number) => coda.some((p: any) => p.id === owner(c)) ? i : -1).filter((i: number) => i >= 0);
    if (!codaIdx.length || nucCells.length !== 1) continue;
    const after = b.cells[codaIdx.at(-1) + 1];
    if (!after || after.text !== "e" || owner(after) >= 0) continue;
    const h: any = B.generateWord({ seed, trace: true });
    const hs = h.trace.graphemeSelections.find((g: any) => g.index === nuc.id);
    console.log(seed, `/${nuc.soundAtSpelling}/ selected ${sel.selected} + [${coda.map((p: any) => p.soundAtSpelling).join(" ")}]`, "stack:", w.written.clean, b.surface, "| head:", h.written.clean, h.trace.baseSpelling?.surface, `selected ${hs?.selected}`, h.pronunciation === w.pronunciation ? "same pron" : "pron differs");
    n++;
  }
}
