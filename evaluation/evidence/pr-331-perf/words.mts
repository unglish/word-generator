const api = await import(`${process.argv[2]}/src/index.ts`);
const out: string[] = [];
for (const mode of ["lexicon", "text"] as const) for (const seed of [31337, 4242, 777, 9001, 123457, 8675309]) {
  const ws = api.generateWords(50000, { seed, mode, trace: true });
  for (const w of ws) out.push(`${mode}\t${seed}\t${w.written.clean}\t${w.pronunciation}\t${(w.trace.spellingBudgets ?? []).map((b: any) => b.status + ":" + (b.reason ?? "")).join(",")}`);
}
console.log(out.join("\n"));
