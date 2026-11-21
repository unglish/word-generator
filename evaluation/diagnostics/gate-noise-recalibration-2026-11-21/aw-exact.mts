// Exact copy of mono-vowel-spelling.test.ts measurement (surfaceNucleusForms + loop).
const root = process.argv[2];
const { createGenerator, englishConfig, createSeededRng } = await import(`${root}/src/index.ts`);
function surfaceNucleusForms(word: any) {
  const base = word.trace!.baseSpelling!;
  const out: any[] = [];
  for (const unit of base.units) {
    const phoneMeta = base.phones[unit.phoneIds[0]];
    if (phoneMeta.segment !== "nucleus") continue;
    let form = typeof unit.afterDoubling === "string" ? unit.afterDoubling : String(unit.afterDoubling ?? unit.selected);
    const selected = unit.selected; let split = false;
    for (const edit of base.edits ?? []) {
      if (edit.rule === "silentE:swap" && edit.before === form) { form = edit.after; continue; }
      if (edit.rule === "silentE:marker") {
        const hadSwap = (base.edits ?? []).some((e: any) => e.rule === "silentE:swap" && (e.before === selected || e.after === form));
        if (hadSwap || form.length === 1) split = true; continue;
      }
      if (typeof edit.before === "string" && typeof edit.after === "string" && edit.before === form) form = edit.after;
    }
    out.push({ phone: phoneMeta.soundAtSpelling, selected, surface: form, split });
  }
  return out;
}
for (const set of process.argv.slice(3)) {
  const seeds = set.split(",").map(Number);
  const gen = createGenerator({ ...englishConfig, syllableStructure: { ...englishConfig.syllableStructure, letterLengthTargets: undefined } });
  const t0 = Date.now(); let aw = 0, o = 0;
  for (const seed of seeds) {
    const rand = createSeededRng(seed); let kept = 0, draws = 0;
    while (kept < 4000 && draws < 160000) {
      draws++;
      const word = gen.generateWord({ rand, mode: "lexicon", morphology: false, trace: true });
      if (word.syllables.length !== 1) continue; kept++;
      const cluster = word.syllables[0].coda.length >= 2;
      for (const f of surfaceNucleusForms(word)) if (f.phone === "ɔ") { o++; if (f.surface === "aw" && cluster) aw++; }
    }
  }
  console.log(set, (aw/o*100).toFixed(2)+"%", `${aw}/${o}`, `${Date.now()-t0}ms`);
}
