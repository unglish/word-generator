// usage: tsx shares.mts <src/index.ts> N firstSeed — root-initial onsetless /aɪ/ spellings, and /aɪ/ is
const [src, n, first] = process.argv.slice(2);
const { generateWord } = await import(src);
const c: Record<string, Record<string, number>> = { initial: {}, afterPrefix: {} };
const is = { onset: 0, onsetless: 0 }; const isEx: string[] = [];
for (let i = 0; i < Number(n); i++) {
  const w: any = generateWord({ seed: Number(first) + i, trace: true });
  const G = w.trace.graphemeSelections; const pre = w.trace.morphology?.prefix;
  G.forEach((g: any, k: number) => {
    if (g.phoneme !== "aɪ" || g.position !== "nucleus") return;
    const onset = G.slice(0, k).some((h: any) => h.syllableIndex === g.syllableIndex && h.position === "onset");
    if (g.selected === "is") { onset ? is.onset++ : is.onsetless++; if (onset && isEx.length < 5) isEx.push(w.written.clean); }
    if (onset || g.syllableIndex !== 0) return;
    const b = pre ? c.afterPrefix : c.initial; b[g.selected] = (b[g.selected] ?? 0) + 1;
  });
}
for (const [k, v] of Object.entries(c)) {
  const t = Object.values(v).reduce((a, b) => a + b, 0);
  console.log(k, t, Object.entries(v).sort((a, b) => b[1] - a[1]).map(([f, x]) => `${f} ${x} (${(100 * x / t).toFixed(1)}%)`).join(", "));
}
console.log("is: with onset", is.onset, "onsetless", is.onsetless, isEx.join(" "));
