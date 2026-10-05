import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { buildGraphemeMaps } from "../../../src/elements/graphemes/index.js";
import { createFollowingObserver } from "./observe-following.js";

const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw new Error("Provide archived input and a new output path");
const observers = new Map<string, ReturnType<typeof createFollowingObserver>>();
const output: string[] = [];
let words = 0;
for (const line of gunzipSync(readFileSync(source)).toString("utf8").trim().split("\n")) {
  const record = JSON.parse(line);
  if (record.kind === "configuration") {
    if (observers.has(record.name)) throw new Error("Duplicate configuration");
    // These fixture producers derive maps from the complete inventory; JSON loses Map values.
    if (!["default", "split", "normalized-custom"].includes(record.name)) throw new Error("Unknown map reconstruction contract");
    observers.set(record.name, createFollowingObserver({ ...record.config, ...buildGraphemeMaps(record.config.graphemes) }));
  } else if (record.kind === "observation") {
    const observe = observers.get(record.name);
    if (!observe) throw new Error("Missing configuration");
    record.observation = observe(record.word);
    words++;
  } else throw new Error("Unknown fixture record");
  output.push(JSON.stringify(record));
}
writeFileSync(destination, gzipSync(output.join("\n") + "\n"), { flag: "wx" });
console.log(JSON.stringify({ source, destination, words }));
