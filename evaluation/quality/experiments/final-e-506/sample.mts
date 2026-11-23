import { createWriteStream } from "node:fs";
import { once } from "node:events";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [checkout, output, first = "5000000", count = "100000"] = process.argv.slice(2);
const { generateWord } = await import(pathToFileURL(resolve(checkout, "src/index.ts")).href);
const stream = createWriteStream(output);
for (let seed = Number(first); seed < Number(first) + Number(count); seed++) {
  const word = generateWord({ seed, trace: true });
  const trace = word.trace;
  if (!trace) throw new Error(`Missing trace for seed ${seed}`);
  const affix = trace.morphology?.realization;
  const orthography = trace.orthography;
  const owner = orthography?.chars.at(-1);
  const lastUnit = orthography?.graphemeUnits.at(-1);
  const row = {
    seed,
    written: word.written,
    pronunciation: word.pronunciation,
    base: trace.baseSpelling?.surface,
    lastUnit,
    owner,
    ownerSelection: owner && trace.graphemeSelections[owner.graphemeSelectionIndex]?.selected,
    planned: affix?.suffix?.planned.written,
    resolved: affix?.suffix?.resolved,
    allomorphIndex: affix?.suffix?.allomorphIndex,
    assembled: affix?.assembledParts,
    emitted: affix?.emittedParts,
  };
  if (!stream.write(JSON.stringify(row) + "\n")) await once(stream, "drain");
}
stream.end();
await once(stream, "finish");
