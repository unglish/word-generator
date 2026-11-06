import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
const api = await import(`${process.argv[2]}/src/index.ts`);
const h = createHash("sha256"); let n = 0; const sample: string[] = [];
for (const mode of ["lexicon", "text"] as const) for (const morphology of [true, false]) for (const syllableCount of [undefined, 1, 3]) {
  const ws = api.generateWords(8000, { seed: 99, mode, morphology, ...(syllableCount ? { syllableCount } : {}), trace: true });
  for (const w of ws) { const s = JSON.stringify(w); h.update(s); n++; if (n % 5000 === 0) sample.push(s); }
}
writeFileSync(process.argv[3], sample.join("\n"));
console.log(h.digest("hex").slice(0, 16), n);
