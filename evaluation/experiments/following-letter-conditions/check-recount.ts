import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { createGenerator, createSeededRng, englishConfig } from "../../../src/index.js";
import { englishSplitVowelSupports } from "../../../src/elements/graphemes/split-vowels.js";
import { createFollowingObserver } from "./observe-following.js";

const destination = process.argv[2];
if (!destination) throw new Error("Provide a new .jsonl.gz fixture destination");
const split = { ...englishConfig, splitVowels: { supports: englishSplitVowelSupports, routes: {
  syllable: { forms: ["ae", "ie", "oe", "ue", "ye"], probability: 95 },
  word: { swaps: englishConfig.silentE!.swaps, probability: 35, monosyllableMultiplier: 2 },
} } };
const records: string[] = [];
for (const [name, config] of [["default", englishConfig], ["split", split]] as const) {
  const generator = createGenerator(config);
  const observe = createFollowingObserver(config);
  const rand = createSeededRng(129);
  records.push(JSON.stringify({ kind: "configuration", name, config }));
  if (name === "split") {
    const { word } = JSON.parse(readFileSync(new URL("./exploration/c-before-a-witness.json", import.meta.url), "utf8"));
    records.push(JSON.stringify({ kind: "observation", name, coordinate: "archived-carowngs", word, observation: observe(word) }));
  }
  for (let index = 0; index < 120; index++) {
    const word = generator.generateWord({ rand, trace: true, morphology: index % 2 === 0 });
    records.push(JSON.stringify({ kind: "observation", name, coordinate: { seed: 129, index }, word, observation: observe(word) }));
  }
}
writeFileSync(destination, gzipSync(records.join("\n") + "\n"), { flag: "wx" });
console.log(JSON.stringify({ destination, configurations: 2, words: 241 }));
