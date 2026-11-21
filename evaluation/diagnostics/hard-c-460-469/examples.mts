// usage: examples.mts <base index.ts> <cand index.ts> seeds...
const [, , baseSrc, candSrc, ...seeds] = process.argv;
const base = await import(baseSrc), cand = await import(candSrc);
const show = (w: any) => w.trace.graphemeSelections.map((g: any) =>
  `${g.phoneme}>${g.emitted}${g.letterRespelled ? `→${g.letterRespelled.form}` : ""}`).join(" ");
for (const s of seeds.map(Number)) {
  const a = base.generateWord({ seed: s, trace: true }), b = cand.generateWord({ seed: s, trace: true });
  console.log(`seed ${s}: ${a.written.clean} → ${b.written.clean}  /${b.pronunciation}/  suffix ${b.trace.morphology?.suffix ?? "-"}`);
  console.log(`  graphemes: ${show(b)}`);
  for (const r of b.trace.repairs.filter((r: any) => r.rule.startsWith("hardLetter"))) console.log(`  repair ${r.rule}: ${r.before} → ${r.after} (${r.detail})`);
  const u = cand.generateWord({ seed: s });
  console.log(`  untraced: ${u.written.clean} (${u.written.clean === b.written.clean ? "same" : "DIFF"})`);
}
