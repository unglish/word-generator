// /ɔ/ "aw" before a coda cluster in monosyllables, as mono-vowel-spelling.test.ts measures it.
const side = process.argv[2];
const root = side === "base" ? "wtr2" : "w470";
const { createGenerator, englishConfig, createSeededRng } = await import(`<scratch>/${root}/src/index.ts`);
const gen = createGenerator({ ...englishConfig, syllableStructure: { ...englishConfig.syllableStructure, letterLengthTargets: undefined } });
const seedSets = process.argv.slice(3).map(s => s.split(",").map(Number));
for (const seeds of seedSets) {
  let aw = 0, o = 0;
  for (const seed of seeds) {
    const rand = createSeededRng(seed); let kept = 0, draws = 0;
    while (kept < 4000 && draws < 160000) {
      draws++;
      const word = gen.generateWord({ rand, mode: "lexicon", morphology: false, trace: true });
      if (word.syllables.length !== 1) continue; kept++;
      const syl = word.syllables[0]; const cluster = syl.coda.length >= 2;
      const base = word.trace.baseSpelling;
      for (const unit of base.units) {
        const ph = base.phones[unit.phoneIds[0]]; if (ph.segment !== "nucleus" || ph.soundAtSpelling !== "ɔ") continue;
        let form = String(unit.afterDoubling ?? unit.selected);
        for (const e of base.edits ?? []) { if (e.rule === "silentE:swap" && e.before === form) { form = e.after; continue; } if (e.rule === "silentE:marker") continue; if (typeof e.before === "string" && e.before === form) form = e.after; }
        o++; if (form === "aw" && cluster) aw++;
      }
    }
  }
  console.log(side, seeds.join(","), (aw / o).toFixed(4), `${aw}/${o}`);
}
