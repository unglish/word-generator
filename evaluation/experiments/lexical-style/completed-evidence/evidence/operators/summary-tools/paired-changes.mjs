import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { isDeepStrictEqual } from "node:util";
import { createGunzip } from "node:zlib";

async function* records(path) {
  const source = createReadStream(path), decompressor = createGunzip();
  source.on("error", error => decompressor.destroy(error));
  const lines = createInterface({ input: source.pipe(decompressor), crlfDelay: Infinity });
  try { for await (const line of lines) yield JSON.parse(line); }
  finally { lines.close(); source.destroy(); decompressor.destroy(); }
}
export async function pairedChanges(paths, profile, seed) {
  const control = records(paths.control), candidate = records(paths.candidate);
  const counts = { words: 0, completeWordChanges: 0, spellingChanges: 0,
    pronunciationChanges: 0, lexicalChanges: 0, syllableChanges: 0, traceChanges: 0 };
  try {
    while (true) {
      const [a, b] = await Promise.all([control.next(), candidate.next()]);
      assert.equal(a.done, b.done);
      if (a.done) break;
      for (const row of [a.value, b.value]) {
        assert.equal(row.profile, profile); assert.equal(row.seed, seed);
        assert.equal(row.drawIndex, counts.words);
      }
      const left = a.value.word, right = b.value.word;
      for (const word of [left, right]) {
        assert(word && typeof word === "object");
        assert(Array.isArray(word.syllables)); assert.equal(typeof word.pronunciation, "string");
        for (const field of ["written", "lexical", "trace"]) assert(word[field] && typeof word[field] === "object");
      }
      counts.completeWordChanges += Number(!isDeepStrictEqual(left, right));
      for (const [field, counter] of [["written", "spellingChanges"], ["pronunciation", "pronunciationChanges"],
        ["lexical", "lexicalChanges"], ["syllables", "syllableChanges"], ["trace", "traceChanges"]]) {
        counts[counter] += Number(!isDeepStrictEqual(left[field], right[field]));
      }
      counts.words++;
    }
    assert.equal(counts.words, 10000);
    return counts;
  } finally { await control.return(); await candidate.return(); }
}
