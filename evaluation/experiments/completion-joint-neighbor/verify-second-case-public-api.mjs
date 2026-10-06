import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const [controlRoot, candidateRoot] = process.argv.slice(2);
assert(controlRoot && candidateRoot, "Provide exact control and candidate checkout roots");
const fixture = JSON.parse(gunzipSync(readFileSync(new URL("q14a-second-case-public-replay.json.gz", import.meta.url))));
const configuration = JSON.parse(readFileSync(new URL("evidence/measured-configuration.json", import.meta.url)));
for (const [label, root] of [["red", controlRoot], ["green", candidateRoot]]) {
  const api = await import(pathToFileURL(resolve(root, "src/index.ts")).href);
  const generator = api.createGenerator({ ...api.englishConfig, splitVowels: configuration });
  for (let repetition = 0; repetition < 2; repetition++) {
    let cursor = 0;
    const { tape, word: expected } = fixture[label];
    const word = generator.generateWord({ mode: "lexicon", morphology: false, trace: true, rand: () => {
      assert(cursor < tape.length, "Frozen RNG tape exhausted");
      return tape[cursor++];
    } });
    assert.equal(cursor, tape.length);
    assert.deepEqual(JSON.parse(JSON.stringify(word)), expected);
  }
}
assert.equal(fixture.red.word.written.clean, "sulkicmarened");
assert.equal(fixture.green.word.written.clean, "shoolkicmarened");
assert.deepEqual(fixture.red.word.trace.baseSpelling.phones.map(phone => phone.soundAtSpelling),
  fixture.green.word.trace.baseSpelling.phones.map(phone => phone.soundAtSpelling));
assert(fixture.red.word.trace.baseSpelling.completion.attempts.some(({ attempt }) => attempt.sample?.status === "infeasible"));
assert(fixture.green.word.trace.baseSpelling.completion.certificates.some(certificate => certificate.neighborReplacements?.length));
console.log(JSON.stringify({ passed: true, publicCalls: 4, phoneSequencePreserved: true,
  scope: "Complete serialized Word/trace equality with separately frozen RNG tapes; no stack instrumentation during verification, no identical-seed-stream claim" }));
