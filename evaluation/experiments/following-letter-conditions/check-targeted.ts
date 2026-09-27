import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { englishConfig } from "../../../src/index.js";
import { englishSplitVowelSupports } from "../../../src/elements/graphemes/split-vowels.js";
import { createFollowingObserver } from "./observe-following.js";

const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw new Error("Provide source witness JSON and a new output .jsonl.gz path");
const config = { ...englishConfig, splitVowels: { supports: englishSplitVowelSupports, routes: {
  syllable: { forms: ["ae", "ie", "oe", "ue", "ye"], probability: 95 },
  word: { swaps: englishConfig.silentE!.swaps, probability: 35, monosyllableMultiplier: 2 },
} } };
const observe = createFollowingObserver(config);
const input = JSON.parse(readFileSync(source, "utf8"));
const output = [JSON.stringify({ kind: "configuration", name: "split", config })];
for (const witness of input.witnesses) {
  const observation = observe(witness.word);
  const roots = observation.events.filter(event => event.boundary === "final-root");
  if (witness.purpose.startsWith("context-before-")) {
    const origin = witness.purpose.slice("context-before-".length);
    assert.ok(roots.some(event => event.reading?.kind === "following-letter" && event.context?.kind === "letter" && event.context.origin === origin), witness.purpose);
  } else if (witness.purpose === "licensed") {
    const cells = witness.word.trace.baseSpelling.cells;
    assert.ok(roots.some(event => event.ownership === "single-owned" && event.cellIds?.some(id => cells.some((cell: { id: number; origin: { kind: string } }) => cell.id === id && cell.origin.kind === "licensed"))));
    const damaged = structuredClone(witness.word);
    const licensed = damaged.trace.baseSpelling.cells.find((cell: { origin: { kind: string } }) => cell.origin.kind === "licensed");
    licensed.origin.certificateId = 999999;
    assert.throws(() => observe(damaged));
  }
  output.push(JSON.stringify({ kind: "observation", name: "split", coordinate: {
    profile: witness.profile, seed: witness.seed, drawIndex: witness.drawIndex, purpose: witness.purpose },
    word: witness.word, observation }));
}
writeFileSync(destination, gzipSync(output.join("\n") + "\n"), { flag: "wx" });
console.log(JSON.stringify({ destination, words: input.witnesses.length, sourceSha256: input.sha256 }));
