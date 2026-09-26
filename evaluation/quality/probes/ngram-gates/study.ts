import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { once } from "node:events";
import { join, resolve } from "node:path";
import { finished } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { createGzip, gzipSync } from "node:zlib";
import { createSeededRng, generateWord } from "../../../../src/index.js";
import type { Word } from "../../../../src/types.js";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const PROBE = "evaluation/quality/probes/ngram-gates";
const PERIOD = 2 ** 32;
const STEP = 0x6d2b79f5;
const OPTIONS = { mode: "lexicon", morphology: true } as const;
type Counts = Record<string, number>;
export interface Thresholds {
  maxBigramOverRepresentation: number;
  maxTrigramOverRepresentation: number;
  minBigramRepresentation: number;
  minTrigramRepresentation: number;
  minBigramBaselineFreq: number;
  minTrigramBaselineFreq: number;
  sampleSize: number;
}
export interface ScheduleEntry { id: string; seed: number; phase: number | null; capacity: number }
interface SourceFile { path: string; content: string }

export function sha(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function advanceSeed(seed: number, calls: number): number {
  if (!Number.isSafeInteger(calls) || calls < 0) throw new Error("Invalid RNG call count.");
  return Number((BigInt(seed >>> 0) + BigInt(STEP) * BigInt(calls)) % BigInt(PERIOD));
}

export function streamSchedule(id: string, count: number, controlSeed: number): ScheduleEntry[] {
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error("Invalid replicate count.");
  const anchor = createHash("sha256").update(id).digest().readUInt32BE(0);
  return [{ id: "control", seed: controlSeed, phase: null, capacity: PERIOD }, ...Array.from({ length: count }, (_, i) => {
    const phase = Math.floor(i * PERIOD / count);
    const next = Math.floor((i + 1) * PERIOD / count);
    return { id: `study-${String(i + 1).padStart(2, "0")}`, seed: advanceSeed(anchor, phase), phase, capacity: next - phase };
  })];
}

export function addNgrams(text: string, size: number, counts: Counts): number {
  for (let i = 0; i <= text.length - size; i++) {
    const gram = text.slice(i, i + size);
    counts[gram] = (counts[gram] ?? 0) + 1;
  }
  return Math.max(0, text.length - size + 1);
}

export function evaluateGate(counts: Counts, total: number, reference: Counts, cutoff: number, threshold: number, direction: "over" | "under") {
  const referenceTotal = Object.values(reference).reduce((a, b) => a + b, 0);
  let worst: { ngram: string; generatedCount: number; referenceCount: number; ratio: number } | null = null;
  // Match the gate test's enumeration and strict tie comparison, including zero-count reference categories.
  const keys = direction === "over" ? Object.keys(counts) : Object.keys(reference);
  for (const ngram of keys) {
    const referenceCount = reference[ngram] ?? 0;
    if (referenceCount / referenceTotal <= cutoff) continue;
    const generatedCount = counts[ngram] ?? 0;
    const ratio = (generatedCount / total) / (referenceCount / referenceTotal);
    if (!worst || (direction === "over" ? ratio > worst.ratio : ratio < worst.ratio)) {
      worst = { ngram, generatedCount, referenceCount, ratio };
    }
  }
  if (!worst || total <= 0 || referenceTotal <= 0) throw new Error("A gate has no eligible observations.");
  return { ...worst, generatedTotal: total, referenceTotal, cutoff, threshold, direction,
    failed: direction === "over" ? worst.ratio > threshold : worst.ratio < threshold };
}

export function evaluateGates(bigrams: Counts, bigramTotal: number, trigrams: Counts, trigramTotal: number, references: [Counts, Counts], thresholds: Thresholds) {
  return {
    bigramOver: evaluateGate(bigrams, bigramTotal, references[0], 0.001, thresholds.maxBigramOverRepresentation, "over"),
    trigramOver: evaluateGate(trigrams, trigramTotal, references[1], 0.001, thresholds.maxTrigramOverRepresentation, "over"),
    bigramUnder: evaluateGate(bigrams, bigramTotal, references[0], thresholds.minBigramBaselineFreq, thresholds.minBigramRepresentation, "under"),
    trigramUnder: evaluateGate(trigrams, trigramTotal, references[1], thresholds.minTrigramBaselineFreq, thresholds.minTrigramRepresentation, "under"),
  };
}

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 30 * 1024 * 1024 });
}

async function collect(directory: string): Promise<SourceFile[]> {
  const files: SourceFile[] = [];
  for (const entry of (await readdir(join(ROOT, directory), { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : 1)) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await collect(path));
    else if (/\.(ts|js|json|py)$/.test(path)) files.push({ path, content: await readFile(join(ROOT, path), "utf8") });
  }
  return files;
}

async function snapshot(): Promise<SourceFile[]> {
  const files = await collect("src");
  files.push(...await collect(PROBE));
  for (const path of ["package.json", "package-lock.json", "tsconfig.json", "data/cmu/cmu-lexicon-bigrams.json", "data/cmu/cmu-lexicon-trigrams.json"]) {
    files.push({ path, content: await readFile(join(ROOT, path), "utf8") });
  }
  return files.sort((a, b) => a.path < b.path ? -1 : 1);
}

function verifyOriginal(sources: SourceFile[], commit: string): void {
  const paths = git("ls-tree", "-r", "--name-only", commit, "src").trim().split("\n").filter(path => /\.(ts|js|json)$/.test(path)).sort();
  const current = sources.filter(file => file.path.startsWith("src/"));
  if (!isDeepStrictEqual(paths, current.map(file => file.path))) throw new Error("Generator file set differs from the pinned original.");
  for (const file of sources.filter(file => !file.path.startsWith(`${PROBE}/`))) {
    if (git("show", `${commit}:${file.path}`) !== file.content) throw new Error(`Pinned source or reference differs: ${file.path}`);
  }
}

async function openArchive(path: string) {
  const target = createWriteStream(path, { flags: "wx" });
  const gzip = createGzip({ level: 9 });
  gzip.pipe(target);
  const completion = Promise.all([finished(gzip), finished(target)]);
  // Observe rejection immediately even while generation is synchronous.
  void completion.catch(() => undefined);
  target.on("error", error => gzip.destroy(error));
  return {
    async write(value: unknown) {
      if (!gzip.write(`${JSON.stringify(value)}\n`)) await once(gzip, "drain");
    },
    async close() { gzip.end(); await completion; },
    abort(error: Error) { gzip.destroy(error); target.destroy(error); },
  };
}

export function traceReplay(word: Word, wordSeed: number, expectedCalls: number): Word {
  const rng = createSeededRng(wordSeed);
  let calls = 0;
  const traced = generateWord({ ...OPTIONS, trace: true, rand: () => { calls++; return rng(); } });
  const { trace, ...plain } = traced;
  if (!trace || calls !== expectedCalls || !isDeepStrictEqual(plain, word)) throw new Error("Trace replay changes output or RNG consumption.");
  return traced;
}

async function captureReplicate(entry: ScheduleEntry, words: number, references: [Counts, Counts], thresholds: Thresholds, directory: string) {
  const bigrams: Counts = Object.create(null);
  const trigrams: Counts = Object.create(null);
  const eligible = references.map((reference, index) => {
    const total = Object.values(reference).reduce((a, b) => a + b, 0);
    const cutoff = Math.min(0.001, index === 0 ? thresholds.minBigramBaselineFreq : thresholds.minTrigramBaselineFreq);
    return new Set(Object.keys(reference).filter(gram => reference[gram] / total > cutoff));
  });
  const witnesses: Record<string, number[]> = Object.fromEntries(eligible.flatMap(set => [...set].map(gram => [gram, []])));
  const rng = createSeededRng(entry.seed);
  let calls = 0;
  const rand = () => {
    if (calls >= entry.capacity) throw new Error(`RNG stream ${entry.id} exceeds its reserved phase interval.`);
    calls++;
    return rng();
  };
  const writtenPath = `${entry.id}-written.jsonl.gz`;
  const tracePath = `${entry.id}-traces.jsonl.gz`;
  const written = await openArchive(join(directory, writtenPath));
  const traces = await openArchive(join(directory, tracePath));
  let bigramTotal = 0;
  let trigramTotal = 0;
  let traceWords = 0;
  try {
    for (let draw = 0; draw < words; draw++) {
      const startCalls = calls;
      const word = generateWord({ ...OPTIONS, rand });
      const text = word.written.clean.toLowerCase();
      bigramTotal += addNgrams(text, 2, bigrams);
      trigramTotal += addNgrams(text, 3, trigrams);
      await written.write({ draw, written: word.written.clean });
      const hits = new Set<string>();
      for (const size of [2, 3]) {
        for (let i = 0; i <= text.length - size; i++) {
          const gram = text.slice(i, i + size);
          if (eligible[size - 2].has(gram) && witnesses[gram].length < 3) hits.add(gram);
        }
      }
      if (hits.size) {
        const wordSeed = advanceSeed(entry.seed, startCalls);
        const replay = traceReplay(word, wordSeed, calls - startCalls);
        for (const gram of hits) witnesses[gram].push(draw);
        await traces.write({ draw, wordSeed, startCalls, calls: calls - startCalls, grams: [...hits], word: replay });
        traceWords++;
      }
    }
    await Promise.all([written.close(), traces.close()]);
  } catch (error) {
    written.abort(error as Error); traces.abort(error as Error);
    throw error;
  }
  const artifacts = await Promise.all([writtenPath, tracePath].map(async file => {
    const bytes = await readFile(join(directory, file));
    return { file, bytes: bytes.length, sha256: sha(bytes) };
  }));
  const rngCalls = calls;
  const nextRng = rand();
  return { ...entry, words, rngCalls, consumedStatesIncludingNextValue: calls, nextRng, traceWords, witnesses,
    bigrams, bigramTotal, trigrams, trigramTotal, gates: evaluateGates(bigrams, bigramTotal, trigrams, trigramTotal, references, thresholds), artifacts };
}

export async function captureStudy(directory: string) {
  const sources = await snapshot();
  const protocol = JSON.parse(sources.find(file => file.path === `${PROBE}/protocol.json`)!.content) as {
    id: string; generatorCommit: string; wordsPerReplicate: number; replicates: number; controlSeed: number; options: typeof OPTIONS;
  };
  if (!isDeepStrictEqual(protocol.options, OPTIONS)) throw new Error("Protocol options differ from the implemented options.");
  const commit = git("rev-parse", protocol.generatorCommit).trim();
  verifyOriginal(sources, commit);
  const thresholds = JSON.parse(sources.find(file => file.path === "src/config/ngram-thresholds.json")!.content) as Thresholds;
  if (protocol.wordsPerReplicate !== thresholds.sampleSize) throw new Error("Protocol sample size differs from the gate contract.");
  const references = ["bigrams", "trigrams"].map(name => JSON.parse(sources.find(file => file.path === `data/cmu/cmu-lexicon-${name}.json`)!.content)) as [Counts, Counts];
  const schedule = streamSchedule(protocol.id, protocol.replicates, protocol.controlSeed);
  await mkdir(directory); // Atomic claim: never append to or overwrite another study.
  const startedAt = new Date().toISOString();
  await writeFile(join(directory, "sources.json.gz"), gzipSync(JSON.stringify(sources)), { flag: "wx" });
  await writeFile(join(directory, "protocol.json"), `${JSON.stringify({ protocol, schedule }, null, 2)}\n`, { flag: "wx" });
  const replicates = [];
  for (const entry of schedule) {
    const replicate = await captureReplicate(entry, protocol.wordsPerReplicate, references, thresholds, directory);
    replicates.push(replicate);
    await writeFile(join(directory, `${entry.id}.json`), `${JSON.stringify(replicate)}\n`, { flag: "wx" });
    console.log(JSON.stringify({ id: entry.id, words: replicate.words, rngCalls: replicate.rngCalls, gates: replicate.gates }));
  }
  if (!isDeepStrictEqual(sources, await snapshot())) throw new Error("Source or reference contents changed during the study.");
  const study = replicates.filter(replicate => replicate.phase !== null);
  const failureCounts = Object.fromEntries(Object.keys(study[0].gates).map(key => [key, study.filter(replicate => replicate.gates[key as keyof typeof replicate.gates].failed).length]));
  const artifactFiles = (await readdir(directory)).sort();
  const artifacts = await Promise.all(artifactFiles.map(async file => {
    const bytes = await readFile(join(directory, file));
    return { file, bytes: bytes.length, sha256: sha(bytes) };
  }));
  const report = { schemaVersion: 1, protocol, schedule, generatorCommit: commit,
    sourceDigest: sha(JSON.stringify(sources)), startedAt, completedAt: new Date().toISOString(),
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    failureCounts, anyGateFailures: study.filter(replicate => Object.values(replicate.gates).some(gate => gate.failed)).length,
    replicates, artifacts, interpretation: "Observed rejection of unchanged source on disjoint study RNG-state intervals. No independence, confidence interval, linguistic error rate or human preference inference." };
  await writeFile(join(directory, "report.json"), `${JSON.stringify(report)}\n`, { flag: "wx" });
  return report;
}

async function main() {
  const { values } = parseArgs({ options: { out: { type: "string" } } });
  if (!values.out) throw new Error("--out must name a new directory inside an existing parent.");
  const report = await captureStudy(resolve(values.out));
  console.log(JSON.stringify({ failureCounts: report.failureCounts, anyGateFailures: report.anyGateFailures }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
