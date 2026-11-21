const root = process.argv[2]; const N = Number(process.argv[3] ?? 100000); const first = Number(process.argv[4] ?? 5_000_000);
const { generateWord } = await import(root + "/src/index.ts");
const C: Record<string, number> = {}; const ex: Record<string, string[]> = {};
let closed = 0, bad = 0;
for (let i = 0; i < N; i++) { const seed = first + i; const w: any = generateWord({ seed, trace: true }); const G = w.trace.graphemeSelections;
  for (const nuc of G) { if (nuc.phoneme !== "eɪ" || nuc.selected !== "ae") continue; const coda = G.filter((g: any) => g.syllableIndex === nuc.syllableIndex && g.position === "coda"); if (!coda.length) continue; closed++;
    const scope = `syllable:${nuc.syllableIndex}`; const letters = w.trace.repairs.filter((r: any) => r.detail === scope && r.rule.startsWith("spellingRule:")).at(-1)?.after;
    const codaForm = coda.map((g: any) => g.selected).join("+");
    const k = (letters === undefined ? "UNREWRITTEN" : /ae[^aeiouy]/.test(letters) ? "ae+C" : (coda.length === 1 && coda[0].phoneme === "k" && /c[eiy]?$/.test(letters)) ? "soft-c" : (coda.length === 1 && coda[0].phoneme === "g" && /age$/.test(letters)) ? "soft-g" : null);
    if (!k) continue; bad++; const key = k + " coda=" + codaForm; C[key] = (C[key] ?? 0) + 1; (ex[key] ??= []).length < 4 && ex[key].push(`${seed} ${w.written.clean} syl=${letters}`); } }
console.log({ closed, bad }); for (const k of Object.keys(C).sort((a, b) => C[b] - C[a])) console.log(k.padEnd(30), C[k], ex[k].join(" | "));
