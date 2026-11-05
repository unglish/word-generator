/**
 * Issue #381: print one batch as JSON lines (index, written, pronunciation) so a
 * main and branch run of the same seed can be diffed index by index.
 *
 *   node --import tsx evaluation/quality/experiments/ea-spelling-381/diff-batch.ts [count] [seed] > out.jsonl
 */
import { generateWords } from "../../../../src/index.js";

const count = Number(process.argv[2] ?? 100000);
const seed = Number(process.argv[3] ?? 7);
generateWords(count, { seed, morphology: true }).forEach((word, index) =>
  console.log(JSON.stringify([index, word.written.clean, word.pronunciation])));
