import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const current = await import(pathToFileURL(resolve("src/index.ts")).href);
const main = await import(pathToFileURL(resolve(process.argv[2], "src/index.ts")).href);
const hash = createHash("sha256");
for (let seed = 3000000; seed < 3020000; seed++) {
  const opts = { seed, mode: "text", trace: true };
  const a = JSON.stringify(main.generateWord(opts));
  const b = JSON.stringify(current.generateWord(opts));
  if (a !== b) throw new Error(`Text output or trace changed for ${seed}`);
  hash.update(b + "\n");
}
console.log(JSON.stringify({ firstSeed: 3000000, count: 20000, digest: hash.digest("hex") }));
