const { generateWord } = await import(process.argv[2]);
let tot = 0, keep = 0, first = -1; const bad: string[] = [];
for (let s = 2_000_000; s < 2_005_000; s++) {
  const w: any = generateWord({ seed: s, trace: true });
  for (const g of w.trace.graphemeSelections) {
    if (g.phoneme === "n" && g.selection?.segmentPosition === "final" && g.afterCondition.includes("gn")) {
      tot++; if (g.afterPosition.includes("gn")) { keep++; if (first < 0) first = s; } else if (bad.length < 5) bad.push(`${s}:${w.written.clean}:${g.position}`);
    }
  }
}
console.log({ tot, keep, first, bad });
