import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { pairedChanges } from "./paired-changes.mjs";

// Synthetic counter/coordinate fixtures only; no generator or quality evidence.
function rows() {
  return Array.from({ length: 10000 }, (_, drawIndex) => ({ profile: "fixture", seed: 42, drawIndex,
    word: { syllables: [{ onset: ["p"], nucleus: ["a"], coda: ["t"] }], pronunciation: "pat",
      written: { clean: "pat" }, lexical: { syllables: ["pat"] }, trace: { draw: drawIndex } } }));
}
async function compareFixture(control, candidate) {
  const directory = await mkdtemp(join(tmpdir(), "q11b-paired-counter-"));
  const paths = { control: join(directory, "control.gz"), candidate: join(directory, "candidate.gz") };
  try {
    for (const [arm, records] of Object.entries({ control, candidate })) {
      await writeFile(paths[arm], gzipSync(records.map(row => JSON.stringify(row)).join("\n") + "\n"));
    }
    return await pairedChanges(paths, "fixture", 42);
  } finally { await rm(directory, { recursive: true }); }
}
test("counts each changed field independently, including trace-only changes", async () => {
  const control = rows(), candidate = structuredClone(control);
  candidate[1].word.written.clean = "patt";
  candidate[2].word.pronunciation = "pad";
  candidate[3].word.lexical.syllables = ["pad"];
  candidate[4].word.syllables[0].coda = ["d"];
  candidate[5].word.trace.draw = -1;
  candidate[6].word.written.clean = "pad";
  candidate[6].word.pronunciation = "pad";
  assert.deepEqual(await compareFixture(control, candidate), { words: 10000, completeWordChanges: 6,
    spellingChanges: 2, pronunciationChanges: 2, lexicalChanges: 1, syllableChanges: 1, traceChanges: 1 });
});
test("rejects displaced, duplicated, or wrong-seed coordinates", async () => {
  const control = rows();
  for (const mutation of [row => { row.drawIndex++; }, row => { row.drawIndex--; }, row => { row.seed++; }]) {
    const candidate = structuredClone(control); mutation(candidate[321]);
    await assert.rejects(compareFixture(control, candidate));
  }
});
test("rejects one-sided truncation and equally truncated streams", async () => {
  const control = rows();
  await assert.rejects(compareFixture(control, control.slice(0, -1)));
  await assert.rejects(compareFixture(control.slice(0, -1), control.slice(0, -1)));
});
test("rejects missing full-word fields even when absent from both arms", async () => {
  const control = rows(); delete control[42].word.trace;
  await assert.rejects(compareFixture(control, structuredClone(control)));
});
