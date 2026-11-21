import { generateWord } from "<scratch>/w475/src/index.ts";
for (const seed of [2002295, 2002674, 2004250, 2005735, 2017130, 2017684, 2019664]) {
  const w: any = generateWord({ seed, trace: true });
  const st = w.trace.stages.find((s: any) => s.name === "generatePronunciation");
  const last = (x: any) => { const s = x[x.length - 1]; return s.nucleus.map((p: any) => p.sound ?? p).join("") + " " + s.coda.map((p: any) => p.sound ?? p).join(""); };
  const g = w.trace.graphemeSelections.filter((g: any) => g.syllableIndex === w.syllables.length - 1).map((g: any) => `${g.phoneme}:${g.emitted ?? g.selected}`).join(" ");
  console.log(seed, w.written.clean, w.pronunciation, "lexical", last(st.before), "→", last(st.after), "| graphemes", g, "| suffix", w.trace.morphology?.suffix ?? "-");
}
