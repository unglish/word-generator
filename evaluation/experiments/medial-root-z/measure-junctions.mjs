import { createReadStream, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";
import { createGunzip } from "node:zlib";

const [referenceFile, ...runs] = process.argv.slice(2);
if (!referenceFile || runs.length === 0) {
  throw new Error("Pass the Phase 1 root artifact and one or more quality run directories.");
}

const { syllabify } = await import(pathToFileURL(resolve("evaluation/review/wordlikeness/model.ts")).href);
const { ipaToArpabet } = await import(pathToFileURL(resolve("src/phonotactic/ipa-to-arpabet.ts")).href);
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const { artifact, digest } = readJson(referenceFile);
const exclusions = new Set(Object.values(readJson("evaluation/corpus/root-coda-exclusions.json")).flat());
const onsets = new Set(readJson("evaluation/review/wordlikeness/artifacts/reference-v1.json").model.initial_onsets);
const stops = new Set(["p", "t", "k"]);
const vowel = (token) => token !== undefined && /[012]$/.test(token);
const lengthBucket = (syllables) => Math.min(5, syllables.length);

function hasJoin(syllables, sound, onsetMatches = () => true) {
  return syllables.some((left, index) => {
    const right = syllables[index + 1]?.onset[0];
    return left.coda.at(-1) === sound && right !== undefined && onsetMatches(right);
  });
}

function hasIntervocalicPair(tokens, sound) {
  return tokens.some((token, index) => token === sound && vowel(tokens[index - 1])
    && Boolean(tokens[index + 1]) && !vowel(tokens[index + 1]) && vowel(tokens[index + 2]));
}

function soundCounts(tokens, parsed) {
  return {
    parsedS: Number(hasJoin(parsed, "S")),
    parsedZ: Number(hasJoin(parsed, "Z")),
    flatS: Number(hasIntervocalicPair(tokens, "S")),
    flatZ: Number(hasIntervocalicPair(tokens, "Z")),
  };
}

function addCounts(target, delta) {
  for (const [key, value] of Object.entries(delta)) target[key] = (target[key] ?? 0) + value;
}

const rootTokens = new Map(artifact.roots.map((root) => [root.spelling, root.tokens]));
const reference = {};
for (const entry of artifact.ledger) {
  if (entry.status !== "included" || exclusions.has(entry.stem)) continue;
  const tokens = rootTokens.get(entry.stem);
  const parsed = syllabify(tokens, onsets);
  addCounts(reference[lengthBucket(parsed)] ??= {}, { draws: 1, ...soundCounts(tokens, parsed) });
}
console.log(JSON.stringify({ digest, reference }));

async function measure(archive) {
  const observed = {};
  const lengths = {};
  const witnesses = {};
  const stream = createInterface({ input: createReadStream(archive).pipe(createGunzip()), crlfDelay: Infinity });
  for await (const line of stream) {
    const { word, drawIndex, seed } = JSON.parse(line);
    const root = word.lexical.root;
    const tokens = root.flatMap(({ onset, nucleus, coda }) => [
      ...onset.map(({ sound }) => ipaToArpabet(sound)),
      ...nucleus.map(({ sound }) => ipaToArpabet(sound) + "0"),
      ...coda.map(({ sound }) => ipaToArpabet(sound)),
    ]);
    const parsed = syllabify(tokens, onsets);
    addCounts(lengths, { [lengthBucket(parsed)]: 1 });
    const stages = new Map(word.trace.stages.map((stage) => [stage.name, stage.after]));
    const proposed = hasJoin(stages.get("generateSyllables"), "z", (right) => stops.has(right));
    const repaired = hasJoin(stages.get("repairClusters"), "z", (right) => stops.has(right));
    const spelled = hasJoin(stages.get("generateWrittenForm"), "z", (right) => stops.has(right));
    if (proposed) {
      const repairs = word.trace.repairs.filter(({ rule }) => rule === "repairClusters");
      witnesses[repaired ? "retained" : "repaired"] ??= {
        seed, drawIndex, written: word.written.clean, ipa: word.pronunciation, repairs,
      };
    }
    addCounts(observed, {
      draws: 1, ...soundCounts(tokens, parsed),
      proposed: Number(proposed), afterRepair: Number(repaired), atSpelling: Number(spelled),
      lexical: Number(hasJoin(root.map(({ onset, coda }) => ({
        onset: onset.map(({ sound }) => sound), coda: coda.map(({ sound }) => sound),
      })), "z", (right) => stops.has(right))),
      attempts: word.trace.selection.attemptsExecuted,
      fallbacks: Number(word.trace.selection.status === "fallback"),
    });
  }
  const expected = {};
  for (const [length, count] of Object.entries(lengths)) {
    const { draws, ...hits } = reference[length];
    addCounts(expected, Object.fromEntries(Object.entries(hits).map(([key, value]) => [key, count * value / draws])));
  }
  return { observed, expected, witnesses };
}

for (const run of runs) {
  const directory = join(run, "words");
  for (const archive of readdirSync(directory).filter((file) => file.endsWith(".jsonl.gz")).sort()) {
    console.log(JSON.stringify({ run: run.split("/").filter(Boolean).at(-1), archive, ...await measure(join(directory, archive)) }));
  }
}
