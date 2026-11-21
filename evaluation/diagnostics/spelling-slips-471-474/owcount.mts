const { generateWords } = await import(process.argv[2]);
for (const seed of [4730, 1, 2, 3, 470, 471, 472, 473, 474, 999]) {
  let n = 0;
  for (const w of generateWords(5000, { seed, trace: true }) as any[]) {
    const G = w.trace.graphemeSelections;
    G.forEach((g: any, i: number) => { if (g.phoneme === "aʊ" && g.selected === "ow" && ["n", "l"].includes(G[i + 1]?.phoneme)) n++; });
  }
  process.stdout.write(`${seed}:${n} `);
}
console.log();
