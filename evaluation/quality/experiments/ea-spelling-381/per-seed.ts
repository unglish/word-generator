/**
 * Issue #381: one independently seeded word per seed (`generateWord({ seed })`),
 * printed as JSON lines. A word whose pronunciation is identical on main and the
 * branch has the same sounds in the same context, so its spelling change is a
 * direct before/after example.
 *
 *   node --import tsx evaluation/quality/experiments/ea-spelling-381/per-seed.ts [count] > out.jsonl
 */
import { generateWord } from "../../../../src/index.js";

const count = Number(process.argv[2] ?? 100000);
for (let seed = 0; seed < count; seed++) {
  const word = generateWord({ seed, morphology: true });
  console.log(JSON.stringify([seed, word.written.clean, word.pronunciation]));
}
