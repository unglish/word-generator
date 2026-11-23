import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const roots = process.argv.slice(2).map((path) => resolve(path));
const from = (root, path) => import(pathToFileURL(resolve(root, path)).href);
const [{ distributionDistance }, ...generators] = await Promise.all([
  from(roots[0], "evaluation/quality/distribution.ts"),
  ...roots.map((root) => from(root, "src/index.ts")),
]);
const cmu = JSON.parse(readFileSync(resolve(roots[0], "data/cmu/cmu-lexicon-trigrams.json"), "utf8"));
const suffixes = new Set(["ing", "ed", "er", "est", "able"]);

function row({ written, pronunciation, trace, lexical }) {
  const suffix = trace.morphology?.suffix;
  const realization = trace.morphology?.realization;
  return {
    word: written.clean,
    pronunciation,
    base: trace.baseSpelling?.surface,
    suffix,
    assembled: realization?.assembledParts.find((p) => p.role === "root")?.text,
    emitted: realization?.emittedParts.find((p) => p.role === "root")?.text,
    final: lexical.root.at(-1)?.coda.at(-1)?.sound,
    hardC: trace.repairs.filter((r) => r.rule === "hardLetter:hard-c"),
  };
}

function counts() {
  return { zToSs: 0, hToHh: 0, cToCc: 0, cToCk: 0, sToSs: 0, otherDoublings: 0, hardCRepairs: 0, hcFromAddedCc: 0 };
}

function tally(c, r) {
  c.hardCRepairs += r.hardC.length;
  if (!suffixes.has(r.suffix) || !r.base) return;
  const last = r.base.at(-1);
  if (last === "c" && r.assembled === r.base + "k") c.cToCk++;
  if (r.assembled !== r.base + last) return;
  if (last === "s" && r.final === "z") c.zToSs++;
  else if (last === "s") c.sToSs++;
  else if (last === "h") c.hToHh++;
  else if (last === "c") {
    c.cToCc++;
    if (r.emitted !== r.assembled && r.hardC.some(({ before, after }) => before.endsWith("cc") && after.endsWith("ck"))) c.hcFromAddedCc++;
  } else c.otherDoublings++;
}

const summaries = generators.map(() => ({ counts: counts(), trigrams: {}, allWordHh: 0 }));
const changes = [];
for (let seed = 5_000_000; seed < 5_020_000; seed++) {
  const rows = generators.map(({ generateWord }, i) => {
    const r = row(generateWord({ seed, trace: true }));
    const summary = summaries[i];
    tally(summary.counts, r);
    if (r.word.includes("hh")) summary.allWordHh++;
    for (let j = 0; j + 2 < r.word.length; j++) {
      const trigram = r.word.slice(j, j + 3);
      if (/^[a-z]{3}$/.test(trigram)) summary.trigrams[trigram] = (summary.trigrams[trigram] ?? 0) + 1;
    }
    return r;
  });
  const [before, after] = rows;
  if (after && JSON.stringify(before) !== JSON.stringify(after)) changes.push({ seed, before, after });
}

console.log(JSON.stringify({
  sample: "20,000 default words per side, seeds 5000000–5019999",
  summaries: summaries.map(({ counts, trigrams, allWordHh }) => ({
    counts, allWordHh, cmuTrigrams: distributionDistance(trigrams, cmu),
  })),
  changedSpellings: changes.filter(({ before, after }) => before.word !== after.word).length,
  changedPronunciations: changes.filter(({ before, after }) => before.pronunciation !== after.pronunciation).length,
  changes,
}, null, 2));
