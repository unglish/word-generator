const { generateWord } = await import(process.argv[2]);
const w: any = generateWord({ seed: Number(process.argv[3]), trace: true });
console.log(w.written.clean, (w.trace.spellingBudgets ?? []).map((b: any) => `${b.scope}:${b.status}${b.reason ? "/" + b.reason : ""}`).join(" "),
  w.trace.repairs.filter((r: any) => r.rule.startsWith("hardLetter")).map((r: any) => r.detail).join("; "));
