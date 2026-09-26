import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import type { Word, WordGenerationOptions } from "../src/types.js";
import type { SelectionTrace } from "../src/core/trace.js";

type GeneratorApi = Pick<typeof import("../src/index.js"), "generateWord" | "createSeededRng" | "englishConfig">;
const profiles: Array<{ id: string; options: Pick<WordGenerationOptions, "mode" | "morphology" | "syllableCount">; seeds: number[] }> = [
  { id: "lexicon-default", options: { mode: "lexicon", morphology: true }, seeds: [69212153, 101601885, 3921817393, 3948943232, 2089697863] },
  { id: "lexicon-bare", options: { mode: "lexicon", morphology: false }, seeds: [2380207674, 772709128, 1304238451, 1696751198, 1498885173] },
  { id: "monosyllables-bare", options: { mode: "lexicon", morphology: false, syllableCount: 1 }, seeds: [462530651, 62358955, 3297327738, 2001884366, 2353354178] },
  { id: "text-default", options: { mode: "text", morphology: true }, seeds: [4167471042, 2666001996, 3562318933, 1999736106, 1665836705] },
];
const protocol = { id: "rejection-accounting-v1", wordsPerStream: 1000, profiles };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const add = (counts: Record<string, number>, key: string, count = 1) => { counts[key] = (counts[key] ?? 0) + count; };

async function generatorSources(root: string, directory = "src"): Promise<Array<{ path: string; content: string }>> {
  const files: Array<{ path: string; content: string }> = [];
  for (const entry of (await readdir(join(root, directory), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await generatorSources(root, path));
    else if (/\.(ts|js|json)$/.test(path) && !/\.(test|bench)\./.test(path)) files.push({ path, content: await readFile(join(root, path), "utf8") });
  }
  return files;
}

function validateSelection(word: Word, selection: SelectionTrace): void {
  const phones = word.syllables.reduce((total, syllable) => total + syllable.onset.length + syllable.nucleus.length + syllable.coda.length, 0);
  const accepted = selection.status === "accepted";
  const count = selection.attemptsExecuted;
  if (!Number.isInteger(count) || count < 1 || count > selection.criteria.maxAttempts ||
      !Number.isInteger(selection.selectedAttempt) || selection.selectedAttempt < 0 || selection.selectedAttempt >= count ||
      selection.rejectedAttempts !== count - (accepted ? 1 : 0) ||
      accepted !== (selection.acceptedBy !== null) ||
      (accepted && selection.selectedAttempt !== count - 1) ||
      word.trace!.attempts !== count - 1 ||
      selection.proposedLengths.reduce((sum, bin) => sum + bin.count, 0) !== count ||
      selection.selected.syllables !== word.syllables.length || selection.selected.phonemes !== phones ||
      selection.selected.letters !== word.written.clean.length ||
      Object.values(selection.rejectionReasons).some(value => !Number.isInteger(value) || value < 0 || value > selection.rejectedAttempts) ||
      Object.values(selection.rejectionReasons).reduce((sum, value) => sum + value, 0) < selection.rejectedAttempts) {
    throw new Error("Inconsistent selection trace.");
  }
}

interface Stratum {
  words: number;
  observedSearches: number;
  attemptsExecuted: number;
  fallbacks: number;
  proposedLengths: Record<string, number>;
  selectedLengths: Record<string, number>;
}

function collectStream(api: GeneratorApi, profile: typeof profiles[number], seed: number) {
  const rng = api.createSeededRng(seed);
  let rngCalls = 0;
  const rand = () => { rngCalls++; return rng(); };
  const outputHash = createHash("sha256");
  const selectedIndexHash = createHash("sha256");
  const outcomes: Record<string, number> = { exact: 0, relaxed: 0, fallback: 0, unknown: 0 };
  const rejectionReasons: Record<string, number> = {};
  const attemptsExecuted: Record<string, number> = {};
  const selectedAttempts: Record<string, number> = {};
  const strata: Record<string, Stratum> = {};
  const witnesses: Record<string, { drawIndex: number; word: Word }> = {};
  for (let drawIndex = 0; drawIndex < protocol.wordsPerStream; drawIndex++) {
    const word = api.generateWord({ ...profile.options, rand, trace: true });
    const { trace, ...output } = word;
    if (!trace) throw new Error("Probe requires traces.");
    outputHash.update(`${JSON.stringify(output)}\n`);
    const selection = trace.selection;
    selectedIndexHash.update(`${selection?.selectedAttempt ?? trace.attempts}\n`);
    add(selectedAttempts, String(selection?.selectedAttempt ?? trace.attempts));
    const morphology = trace.morphology;
    const actuallyAffixed = morphology && morphology.template !== "bare" && Boolean(morphology.prefix || morphology.suffix);
    const key = `${actuallyAffixed ? morphology.template : "bare"}/syllables:${word.syllables.length}`;
    const stratum = strata[key] ?? (strata[key] = { words: 0, observedSearches: 0, attemptsExecuted: 0, fallbacks: 0, proposedLengths: {}, selectedLengths: {} });
    stratum.words++;
    const phoneCount = word.syllables.reduce((count, syllable) => count + syllable.onset.length + syllable.nucleus.length + syllable.coda.length, 0);
    add(stratum.selectedLengths, `${word.syllables.length}/${phoneCount}/${word.written.clean.length}`);
    if (!selection) { outcomes.unknown++; continue; }
    validateSelection(word, selection);
    const outcome = selection.acceptedBy ?? "fallback";
    outcomes[outcome]++;
    stratum.observedSearches++;
    stratum.attemptsExecuted += selection.attemptsExecuted;
    if (selection.status === "fallback") stratum.fallbacks++;
    add(attemptsExecuted, String(selection.attemptsExecuted));
    for (const [reason, count] of Object.entries(selection.rejectionReasons)) add(rejectionReasons, reason, count);
    for (const bin of selection.proposedLengths) add(stratum.proposedLengths, `${bin.syllables}/${bin.phonemes}/${bin.letters}/${bin.morphologyPhonemes}`, bin.count);
    witnesses[outcome] ??= { drawIndex, word };
  }
  const callsForWords = rngCalls;
  const observedSearches = protocol.wordsPerStream - outcomes.unknown;
  const measuredStrata = Object.fromEntries(Object.entries(strata).map(([key, stratum]) => [key, {
    ...stratum,
    attemptsExecuted: stratum.observedSearches ? stratum.attemptsExecuted : null,
    fallbacks: stratum.observedSearches ? stratum.fallbacks : null,
    proposedLengths: stratum.observedSearches ? stratum.proposedLengths : null,
  }]));
  return {
    profile: profile.id, seed, words: protocol.wordsPerStream, outputDigest: outputHash.digest("hex"),
    selectedIndexDigest: selectedIndexHash.digest("hex"), rngCalls: callsForWords, nextRngValue: rand(),
    observedSearches,
    outcomes: observedSearches ? outcomes : { exact: null, relaxed: null, fallback: null, unknown: outcomes.unknown },
    rejectionReasons: observedSearches ? rejectionReasons : null,
    attemptsExecuted: observedSearches ? attemptsExecuted : null,
    selectedAttempts, strata: measuredStrata, witnesses,
  };
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { "generator-root": { type: "string" }, out: { type: "string" }, compare: { type: "string" } } });
  if (!values.out) throw new Error("--out is required.");
  const scriptPath = fileURLToPath(import.meta.url);
  const root = resolve(values["generator-root"] ?? join(dirname(scriptPath), ".."));
  const sources = await generatorSources(root);
  const sourceDigest = hash(JSON.stringify(sources));
  const evaluatorSource = await readFile(scriptPath, "utf8");
  const api = await import(pathToFileURL(join(root, "src/index.ts")).href) as GeneratorApi;
  const streams = profiles.flatMap(profile => profile.seeds.map(seed => {
    const stream = collectStream(api, profile, seed);
    console.log(`${profile.id}: ${seed}, ${stream.words} words`);
    return stream;
  }));
  if (sourceDigest !== hash(JSON.stringify(await generatorSources(root)))) throw new Error("Generator sources changed during probe.");
  const report = {
    schemaVersion: 1, protocol, environment: { node: process.version },
    generator: { commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), sourceDigest, sources },
    evaluator: { digest: hash(evaluatorSource), source: evaluatorSource },
    effectiveConfig: JSON.parse(JSON.stringify(api.englishConfig, (_key, value) => value instanceof Map ? { $type: "Map", entries: [...value] } : value instanceof RegExp ? { $type: "RegExp", source: value.source, flags: value.flags } : value)),
    streams,
    parity: undefined as { matches: boolean; mismatchedStreams: string[] } | undefined,
  };
  if (values.compare) {
    const baseline = JSON.parse(await readFile(resolve(values.compare), "utf8")) as typeof report;
    if (JSON.stringify(baseline.protocol) !== JSON.stringify(protocol) || baseline.evaluator.digest !== report.evaluator.digest || baseline.environment.node !== report.environment.node) {
      throw new Error("Parity comparison requires the same protocol, evaluator, and Node version.");
    }
    if (baseline.streams.length !== streams.length) throw new Error("Parity comparison has a different stream count.");
    const mismatchedStreams = streams.filter((stream, index) => {
      const before = baseline.streams[index];
      return before.profile !== stream.profile || before.seed !== stream.seed || before.words !== stream.words || before.outputDigest !== stream.outputDigest || before.selectedIndexDigest !== stream.selectedIndexDigest || before.rngCalls !== stream.rngCalls || before.nextRngValue !== stream.nextRngValue;
    }).map(stream => `${stream.profile}/${stream.seed}`);
    report.parity = { matches: mismatchedStreams.length === 0, mismatchedStreams };
    if (!report.parity.matches) process.exitCode = 1;
  }
  const out = resolve(values.out);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(report)}\n`, { flag: "wx" });
  console.log(`Saved ${streams.length * protocol.wordsPerStream} words of rejection evidence: ${out}`);
  if (report.parity) console.log(`Output, selected-index, and RNG parity: ${report.parity.matches ? "PASS" : "FAIL"}`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
