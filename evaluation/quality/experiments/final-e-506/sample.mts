import { createWriteStream } from "node:fs";
import { once } from "node:events";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [checkout, output, firstSeed = "5000000"] = process.argv.slice(2);
const { generateWord } = await import(pathToFileURL(resolve(checkout, "src/index.ts")).href);
const out = createWriteStream(output);
for (let seed = Number(firstSeed); seed < Number(firstSeed) + 20_000; seed++) {
  const word = generateWord({ seed, trace: true });
  const orthography = word.trace?.orthography;
  const realization = word.trace?.morphology?.realization;
  const suffix = realization?.suffix;
  const lastGrapheme = orthography?.graphemeUnits.at(-1);
  const row = {
    seed,
    written: word.written.clean,
    pronunciation: word.pronunciation,
    base: orthography?.surface ?? "",
    lastGrapheme,
    finalLetterOwner: orthography?.chars.at(-1),
    planned: suffix?.planned.written ?? "",
    resolved: suffix?.resolved.written ?? "",
    allomorphIndex: suffix?.allomorphIndex,
    suffixPhones: suffix?.resolved.phonemes,
    assembledParts: realization?.assembledParts,
    emittedParts: realization?.emittedParts,
  };
  if (!out.write(JSON.stringify(row) + "\n")) await once(out, "drain");
}
out.end();
await once(out, "finish");
