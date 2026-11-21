const { generateWord } = await import(process.argv[2] + "/src/index.ts");
for (const seed of process.argv.slice(3).map(Number)) { const w: any = generateWord({ seed, trace: true });
  console.log(seed, w.written.clean, w.trace.graphemeSelections.map((g: any) => `${g.phoneme}>${g.selected}/${g.emitted}@${g.syllableIndex}${g.position[0]}`).join(" "), "|", w.trace.repairs.filter((r: any) => r.rule.startsWith("spelling")).map((r: any) => `${r.rule.slice(13)}[${r.detail}]:${r.before}→${r.after}`).join(" ")); }
