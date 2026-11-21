// Words where /k/ c and /s/ c were merged into one letter by de-duplication (cc → c), and what that letter became.
const { generateWord } = await import(process.argv[2]);
const N = Number(process.argv[3] ?? 20000), first = Number(process.argv[4] ?? 2000000);
let n = 0; const ex: string[] = [];
for (let seed = first; seed < first + N; seed++) {
  const w: any = generateWord({ seed, trace: true });
  const bs = w.trace.baseSpelling;
  const merged = bs.edits.some((e: any) => e.rule.startsWith("deduplicate") && e.input.some((c: any) => c.text === "c") &&
    e.input.some((c: any) => { const u = c.origin.kind === "rewrite" ? undefined : bs.units[c.origin.unitId]; return u && bs.phones[u.phoneIds[0]].soundAtSpelling === "s"; }) &&
    bs.units.some((u: any, i: number) => bs.phones[u.phoneIds[0]].soundAtSpelling === "k" && u.afterDoubling === "c" &&
      bs.units[i + 1] && bs.phones[bs.units[i + 1].phoneIds[0]].soundAtSpelling === "s"));
  if (merged) { n++; if (ex.length < 12) ex.push(`${seed}:${w.written.clean}`); }
}
console.log("k-c + s-c merged by dedupe:", n, ex.join(" "));
