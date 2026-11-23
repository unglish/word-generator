import assert from "node:assert/strict";
import { resolve } from "node:path";
const baselinePath = process.env.BASELINE_ROOT ?? "/private/tmp/unglish-repetition/baseline";
const { generateWord: before } = await import(resolve(baselinePath, "src/index.ts"));
const { generateWord: after } = await import(resolve("src/index.ts"));
for (let seed = 5000000; seed < 5002000; seed++) {
  const options = { mode: "text", seed, trace: true };
  assert.deepEqual(after(options), before(options), `text mode seed ${seed}`);
}
console.log("Text mode: exact word and trace parity across 2,000 matched seeds.");
