import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { distributionDistance } = await import(pathToFileURL(resolve("evaluation/quality/distribution.ts")).href);
const reference = JSON.parse(readFileSync("data/cmu/cmu-lexicon-trigrams.json", "utf8"));
for (const file of process.argv.slice(2)) {
  const counts: Record<string, number> = {};
  for (const line of readFileSync(file, "utf8").trimEnd().split("\n")) {
    const { written } = JSON.parse(line);
    for (let i = 0; i + 2 < written.length; i++) {
      const trigram = written.slice(i, i + 3).toLowerCase();
      if (/^[a-z]{3}$/.test(trigram)) counts[trigram] = (counts[trigram] ?? 0) + 1;
    }
  }
  console.log(file, distributionDistance(counts, reference));
}
