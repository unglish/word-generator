const m = await import(`${process.argv[2]}/src/index.ts`);
for (const seed of process.argv.slice(3).map(Number)) {
  const w: any = m.generateWord({ seed, trace: true });
  console.log(seed, w.written.clean, JSON.stringify(w.trace.baseSpelling.edits.map((e: any) => ({ rule: e.rule, ...Object.fromEntries(Object.entries(e).filter(([k]) => k !== "rule" && k !== "cells")) }))).slice(0, 400));
}
