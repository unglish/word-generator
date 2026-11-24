import { createReadStream, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

const [referenceFile, ...runs] = process.argv.slice(2);
if (!referenceFile || !runs.length) {
  throw new Error("Pass the Phase 1 root artifact and one or more quality run directories.");
}

const load = (path) => import(pathToFileURL(resolve(path)).href);
const { syllabify } = await load("evaluation/review/wordlikeness/model.ts");
const { ipaToArpabet } = await load("src/phonotactic/ipa-to-arpabet.ts");
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const { artifact, digest } = read(referenceFile);
const excluded = new Set(Object.values(read("evaluation/corpus/root-coda-exclusions.json")).flat());
const onsets = new Set(read("evaluation/review/wordlikeness/artifacts/reference-v1.json").model.initial_onsets);
const tracked = ["M.T", "T.P", "D.G", "M.D", "N.P", "T.K", "N.K", "N.G", "NG.K", "NG.G"];
const longNuclei = new Set(["i:", "u", "eɪ", "aɪ", "əʊ", "aʊ", "ɔɪ"]);
const bucket = (root) => Math.min(root.length, 5);
const bump = (counts, key, n = 1) => counts[key] = (counts[key] ?? 0) + n;
const shape = (syllable) => [syllable.onset, syllable.nucleus, syllable.coda].map(part => part.join(",")).join(":");
const asArpabet = (root) => root.map(({ onset, nucleus, coda }) => ({
  onset: onset.map(ipaToArpabet), nucleus: nucleus.map(ipaToArpabet), coda: coda.map(ipaToArpabet),
}));

function trackedJoins(root) {
  const found = new Map();
  for (let index = 1; index < root.length; index++) {
    const { coda } = root[index - 1];
    const { onset } = root[index];
    if (coda.length !== 1 || onset.length !== 1) continue;
    const pair = coda[0] + "." + onset[0];
    if (tracked.includes(pair)) found.set(pair, index);
  }
  return found;
}

const reference = {};
const byRoot = new Map(artifact.roots.map((row) => [row.spelling, row.tokens]));
for (const row of artifact.ledger) {
  if (row.status !== "included" || excluded.has(row.stem)) continue;
  const parsed = syllabify(byRoot.get(row.stem), onsets);
  const counts = reference[bucket(parsed)] ??= {};
  bump(counts, "draws");
  for (const pair of trackedJoins(parsed).keys()) bump(counts, pair);
}
console.log(JSON.stringify({ digest, reference }));

async function measure(archive) {
  const lengths = {};
  const parsedCounts = {};
  const rootCounts = {};
  const witnesses = {};
  const exposure = { longBeforeVelarNasal: 0, medialLongBeforeVelarNasal: 0, attempts: 0, fallbacks: 0 };
  const stream = createInterface({ input: createReadStream(archive).pipe(createGunzip()), crlfDelay: Infinity });
  for await (const line of stream) {
    const { word, seed, drawIndex } = JSON.parse(line);
    const stages = new Map(word.trace.stages.map(stage => [stage.name, stage.after]));
    const root = stages.get("generateWrittenForm");
    const tokens = asArpabet(root).flatMap(({ onset, nucleus, coda }) => [
      ...onset, ...nucleus.map(sound => sound + "0"), ...coda,
    ]);
    const parsed = syllabify(tokens, onsets);
    bump(lengths, bucket(parsed));
    for (const pair of trackedJoins(parsed).keys()) bump(parsedCounts, pair);
    for (const [pair, index] of trackedJoins(asArpabet(root))) {
      bump(rootCounts, pair);
      if (witnesses[pair]) continue;
      const proposed = stages.get("generateSyllables");
      witnesses[pair] = {
        seed, drawIndex, written: word.written.clean, ipa: word.pronunciation,
        proposal: proposed.slice(index - 1, index + 1).map(shape),
        spellingRoot: root.slice(index - 1, index + 1).map(shape),
      };
    }
    const longBeforeVelarNasal = ({ nucleus, coda }) => longNuclei.has(nucleus.at(-1)) && coda[0] === "ŋ";
    exposure.longBeforeVelarNasal += Number(root.some(longBeforeVelarNasal));
    exposure.medialLongBeforeVelarNasal += Number(root.slice(0, -1).some(longBeforeVelarNasal));
    exposure.attempts += word.trace.selection.attemptsExecuted;
    exposure.fallbacks += Number(word.trace.selection.status === "fallback");
  }
  const expected = Object.fromEntries(tracked.map(pair => [
    pair, Object.entries(lengths).reduce((total, [length, count]) =>
      total + count * (reference[length][pair] ?? 0) / reference[length].draws, 0),
  ]));
  return { lengths, parsedCounts, rootCounts, expected, exposure, witnesses };
}

for (const run of runs) {
  const folder = join(run, "words");
  for (const archive of readdirSync(folder).filter(name => name.endsWith(".jsonl.gz")).sort()) {
    console.log(JSON.stringify({ run: run.split("/").filter(Boolean).at(-1), archive, ...await measure(join(folder, archive)) }));
  }
}
