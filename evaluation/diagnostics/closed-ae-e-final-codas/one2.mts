const { generateWord } = await import(process.argv[2] + "/src/index.ts");
for (const a of process.argv.slice(3)) { const [seed, mode] = a.split(":"); const o: any = mode === "bare" ? { morphology: false } : mode === "text" ? { mode: "text" } : {};
  const w: any = generateWord({ seed: Number(seed), trace: true, ...o }); console.log(seed, mode ?? "default", w.written.clean, w.trace.repairs.filter((r: any) => r.rule.startsWith("spellingRule:ae")).map((r: any) => r.rule.slice(13) + ":" + r.before + "→" + r.after).join(" ")); }
