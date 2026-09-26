import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { constants, createReadStream, createWriteStream } from "node:fs";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip, createGzip, gunzipSync, gzipSync } from "node:zlib";
import { createSeededRng, englishConfig, generateWord } from "../../src/index.js";
import type { Word } from "../../src/types.js";
import { canonical, digest } from "./serialization.js";
import type { SourceFile } from "./serialization.js";
import { classifyWord, METRIC_DEFINITIONS, wordStrata } from "./metrics.js";
import type { WordObservations, WordStrata } from "./metrics.js";
import { distributionDistance } from "./distribution.js";
import type { ArchivedProvenance, Artifact, Cohort, Draw, Manifest, MetricCounts, ProfileSummary, Protocol, RunEnvironment, RunSummary, SourceArchive, StratumSummary } from "./model.js";

async function collectFiles(root: string, directory: string, recursive = true): Promise<SourceFile[]> {
  const files: SourceFile[] = [];
  const entries = await readdir(join(root, directory), { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory() && recursive) files.push(...await collectFiles(root, path));
    if (entry.isFile() && /\.(ts|js|mjs|json)$/.test(path) && !/\.(test|bench)\./.test(path)) {
      files.push({ path, content: await readFile(join(root, path), "utf8") });
    }
  }
  return files;
}

async function captureSources(root: string): Promise<SourceArchive> {
  const files = async (paths: string[]) => Promise.all(paths.map(async path => ({ path, content: await readFile(join(root, path), "utf8") })));
  return {
    generator: await collectFiles(root, "src"),
    evaluator: await collectFiles(root, "evaluation/quality", false),
    references: await collectFiles(root, "data/cmu"),
    packageFiles: await files(["package.json", "package-lock.json"]),
  };
}

export function validateProtocol(protocol: Protocol): void {
  if (protocol.schemaVersion !== 1 || !protocol.id || !Number.isSafeInteger(protocol.wordsPerReplicate) || protocol.wordsPerReplicate < 1) {
    throw new Error("Invalid quality protocol version, ID, or sample size.");
  }
  if (!Number.isSafeInteger(protocol.reviewDrawsPerReplicate) || protocol.reviewDrawsPerReplicate < 1 || protocol.reviewDrawsPerReplicate > protocol.wordsPerReplicate) {
    throw new Error("Review sample size must be between one and the replicate sample size.");
  }
  const ids = new Set<string>();
  const seeds = new Set<number>();
  if (protocol.profiles.length === 0) throw new Error("A protocol needs at least one profile.");
  for (const profile of protocol.profiles) {
    if (!/^[a-z0-9-]+$/.test(profile.id) || ids.has(profile.id)) throw new Error("Profile IDs must be unique lowercase slugs.");
    ids.add(profile.id);
    if (!["text", "lexicon"].includes(profile.options.mode ?? "") || typeof profile.options.morphology !== "boolean") {
      throw new Error("Every profile must specify mode and morphology explicitly.");
    }
    const syllables = profile.options.syllableCount;
    if (syllables !== undefined && (!Number.isInteger(syllables) || syllables < 1 || syllables > 7)) {
      throw new Error("A forced syllable count must be an integer from one to seven.");
    }
    for (const cohort of ["development", "validation"] as const) {
      if (profile.seeds[cohort].length < 2) throw new Error("Every profile/cohort needs at least two RNG streams.");
      for (const seed of profile.seeds[cohort]) {
        if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff || seeds.has(seed)) {
          throw new Error("Protocol seeds must be globally distinct unsigned 32-bit integers.");
        }
        seeds.add(seed);
      }
    }
  }
}

function emptyMetrics(): MetricCounts {
  return Object.fromEntries(METRIC_DEFINITIONS.map(({ id }) => [id, { hits: 0, eligible: 0, rate: null }])) as MetricCounts;
}

function accumulate(metrics: MetricCounts, observations: WordObservations, strata: WordStrata): void {
  for (const definition of METRIC_DEFINITIONS) {
    if (!strata[definition.denominator]) continue;
    const metric = metrics[definition.id];
    metric.eligible++;
    if (observations[definition.id]) metric.hits++;
    metric.rate = metric.hits / metric.eligible;
  }
}

function increment(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

async function artifact(directory: string, file: string): Promise<Artifact> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(join(directory, file))) hash.update(chunk);
  return { file, sha256: hash.digest("hex"), bytes: (await stat(join(directory, file))).size };
}

async function saveJson(directory: string, file: string, value: unknown): Promise<void> {
  const content = `${JSON.stringify(value)}\n`;
  await writeFile(join(directory, file), file.endsWith(".gz") ? gzipSync(content) : content, { flag: "wx" });
}

function sourceJson<T>(sources: SourceArchive, path: string): T {
  const file = sources.references.find(file => file.path === path);
  if (!file) throw new Error(`Missing reference ${path}.`);
  return JSON.parse(file.content) as T;
}

export interface CaptureOptions {
  root: string;
  out: string;
  id: string;
  cohort: Cohort;
  protocol: Protocol;
  progress?: (message: string) => void;
}

function validateRunId(id: string): void {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) throw new Error("Run ID must be a lowercase slug (max 80 characters).");
}

function currentEnvironment(packageFiles: SourceFile[]): RunEnvironment {
  const lock = packageFiles.find(file => file.path === "package-lock.json");
  if (!lock) throw new Error("Missing dependency lock in source archive.");
  return {
    node: process.version, platform: process.platform, arch: process.arch,
    packageLockDigest: digest(lock.content),
  };
}

type DrawSource = (profile: Protocol["profiles"][number], seed: number, file: string) => AsyncIterable<Draw>;

/** Both live capture and archived rescoring pass every draw through this accumulator. */
async function evaluateCorpus(
  options: Omit<CaptureOptions, "root">,
  sources: SourceArchive,
  source: DrawSource,
  writeWords: boolean,
): Promise<{ summary: RunSummary; files: string[] }> {
  const { out, id, cohort, protocol, progress } = options;
  const summary: RunSummary = {
    schemaVersion: 1, id, cohort, protocolDigest: digest(protocol),
    evaluatorDigest: digest({ files: sources.evaluator, definitions: METRIC_DEFINITIONS }),
    referenceDigest: digest(sources.references),
    definitions: METRIC_DEFINITIONS, profiles: [],
  };
  const normalization = sourceJson<{ generatedAliases: Record<string, string> }>(sources, "data/cmu/phoneme-normalization.json");
  const phonemeReference = sourceJson<Record<string, number>>(sources, "data/cmu/cmu-lexicon-phonemes.json");
  const trigramReference = sourceJson<Record<string, number>>(sources, "data/cmu/cmu-lexicon-trigrams.json");

  await mkdir(dirname(out), { recursive: true });
  await mkdir(out); // Existing runs are never replaced, including interrupted captures.
  await mkdir(join(out, "words"));
  const files = ["sources.json.gz", "summary.json", "review-samples.json.gz", "witnesses.json.gz", "distributions.json.gz"];
  const reviewSamples: Draw[] = [];
  const witnesses: Record<string, Draw[]> = {};
  const distributions: Record<string, { phonemes: Record<string, number>; trigrams: Record<string, number> }> = {};
  await saveJson(out, "sources.json.gz", sources);

  for (const profile of protocol.profiles) {
    const spellings = new Set<string>();
    const strata = new Map<string, StratumSummary>();
    const counts = { phonemes: {} as Record<string, number>, trigrams: {} as Record<string, number> };
    const result: ProfileSummary = {
      id: profile.id, words: 0, uniqueSpellings: 0, meanLetters: 0,
      syllableCounts: {}, phonemeLengths: {}, morphologyCounts: {}, metrics: emptyMetrics(), replicates: [], strata: [],
      distributions: { phonemes: distributionDistance({}, {}), trigrams: distributionDistance({}, {}) },
    };
    let totalLetters = 0;
    for (const seed of profile.seeds[cohort]) {
      const replicate = { seed, words: 0, metrics: emptyMetrics() };
      const file = `words/${profile.id}-${seed}.jsonl.gz`;
      files.push(file);
      async function* draws(): AsyncGenerator<Draw> {
        for await (const draw of source(profile, seed, file)) {
          if (draw.profile !== profile.id || draw.seed !== seed || draw.drawIndex !== replicate.words || replicate.words >= protocol.wordsPerReplicate) {
            throw new Error(`Invalid draw identity or order in ${file}: expected index ${replicate.words}.`);
          }
          const { word, drawIndex } = draw;
          const observations = classifyWord(word);
          const eligible = wordStrata(word);
          const morphology = eligible.affixedWords ? word.trace!.morphology!.template : "bare";
          const stratumId = `${morphology}/syllables:${word.syllables.length}`;
          let stratum = strata.get(stratumId);
          if (!stratum) {
            stratum = { id: stratumId, words: 0, metrics: emptyMetrics() };
            strata.set(stratumId, stratum);
          }
          result.words++;
          replicate.words++;
          stratum.words++;
          spellings.add(word.written.clean);
          totalLetters += word.written.clean.length;
          increment(result.syllableCounts, String(word.syllables.length));
          increment(result.morphologyCounts, morphology);
          let phoneCount = 0;
          for (const syllable of word.syllables) {
            for (const phoneme of [...syllable.onset, ...syllable.nucleus, ...syllable.coda]) {
              const sound = phoneme.sound.replace(/ʰ/g, "");
              increment(counts.phonemes, normalization.generatedAliases[sound] ?? sound);
              phoneCount++;
            }
          }
          increment(result.phonemeLengths, String(phoneCount));
          const spelling = word.written.clean.toLowerCase();
          for (let i = 0; i + 2 < spelling.length; i++) {
            const trigram = spelling.slice(i, i + 3);
            if (/^[a-z]{3}$/.test(trigram)) increment(counts.trigrams, trigram);
          }
          for (const metrics of [result.metrics, replicate.metrics, stratum.metrics]) accumulate(metrics, observations, eligible);
          if (drawIndex < protocol.reviewDrawsPerReplicate) reviewSamples.push(draw);
          for (const definition of METRIC_DEFINITIONS) {
            if (!observations[definition.id]) continue;
            const key = `${profile.id}/${definition.id}`;
            const examples = witnesses[key] ?? (witnesses[key] = []);
            if (examples.length < 2) examples.push(draw);
          }
          yield draw;
        }
        if (replicate.words !== protocol.wordsPerReplicate) throw new Error(`Incomplete stream ${file}: expected ${protocol.wordsPerReplicate} draws, received ${replicate.words}.`);
      }
      if (writeWords) {
        async function* lines() {
          for await (const draw of draws()) yield `${JSON.stringify(draw)}\n`;
        }
        await pipeline(Readable.from(lines()), createGzip(), createWriteStream(join(out, file), { flags: "wx" }));
      } else {
        for await (const draw of draws()) void draw;
      }
      result.replicates.push(replicate);
      progress?.(`${profile.id}: seed ${seed}, ${replicate.words.toLocaleString()} draws archived`);
    }
    result.uniqueSpellings = spellings.size;
    result.meanLetters = totalLetters / result.words;
    result.strata = [...strata.values()].sort((a, b) => a.id.localeCompare(b.id, "en"));
    result.distributions = {
      phonemes: distributionDistance(counts.phonemes, phonemeReference),
      trigrams: distributionDistance(counts.trigrams, trigramReference),
    };
    distributions[profile.id] = counts;
    summary.profiles.push(result);
  }

  await saveJson(out, "summary.json", summary);
  await saveJson(out, "review-samples.json.gz", reviewSamples);
  await saveJson(out, "witnesses.json.gz", witnesses);
  await saveJson(out, "distributions.json.gz", distributions);
  return { summary, files };
}

export async function captureRun(options: CaptureOptions): Promise<RunSummary> {
  const { root, out, id, cohort, protocol } = options;
  validateRunId(id);
  validateProtocol(protocol);
  const sources = await captureSources(root);
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }).trim();
  const generator: Manifest["generator"] = {
    commit: git("rev-parse", "HEAD"),
    dirty: git("status", "--porcelain", "--", "src").length > 0,
    sourceDigest: digest(sources.generator),
    effectiveConfig: canonical(englishConfig),
    patch: git("diff", "HEAD", "--", "src"),
  };
  const source: DrawSource = async function* (profile, seed) {
    const rand = createSeededRng(seed);
    for (let drawIndex = 0; drawIndex < protocol.wordsPerReplicate; drawIndex++) {
      const word: Word = generateWord({ ...profile.options, rand, trace: true });
      yield { profile: profile.id, seed, drawIndex, word };
    }
  };
  const { summary, files } = await evaluateCorpus(options, sources, source, true);
  if (digest(sources) !== digest(await captureSources(root))) throw new Error("Source, evaluator, dependencies, or references changed during capture. This run is incomplete.");
  const manifest: Manifest = {
    schemaVersion: 1, id, createdAt: new Date().toISOString(), cohort, protocol,
    protocolDigest: summary.protocolDigest, evaluatorDigest: summary.evaluatorDigest, referenceDigest: summary.referenceDigest,
    generator, environment: currentEnvironment(sources.packageFiles),
    artifacts: await Promise.all(files.map(file => artifact(out, file))),
  };
  await saveJson(out, "manifest.json", { manifest, digest: digest(manifest) });
  return summary;
}

function pinnedArtifact(manifest: Manifest, file: string): Artifact {
  const matches = manifest.artifacts.filter(item => item.file === file);
  if (matches.length !== 1) throw new Error(`Manifest must pin exactly one ${file}.`);
  return matches[0];
}

async function readPinnedJson<T>(directory: string, manifest: Manifest, file: string): Promise<T> {
  const expected = pinnedArtifact(manifest, file);
  const bytes = await readFile(join(directory, file));
  if (createHash("sha256").update(bytes).digest("hex") !== expected.sha256 || bytes.length !== expected.bytes) {
    throw new Error(`Artifact verification failed: ${file}`);
  }
  return JSON.parse((file.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString()) as T;
}

async function* archivedDraws(path: string): AsyncGenerator<Draw> {
  const input = createReadStream(path);
  const decompressed = createGunzip();
  input.on("error", error => decompressed.destroy(error));
  input.pipe(decompressed);
  decompressed.setEncoding("utf8");
  let remaining = "";
  try {
    for await (const chunk of decompressed) {
      remaining += chunk;
      let end: number;
      while ((end = remaining.indexOf("\n")) !== -1) {
        yield JSON.parse(remaining.slice(0, end)) as Draw;
        remaining = remaining.slice(end + 1);
      }
    }
    if (remaining.length) yield JSON.parse(remaining) as Draw;
  } finally {
    input.destroy();
    decompressed.destroy();
  }
}

export interface RescoreOptions {
  root: string;
  input: string;
  out: string;
  id: string;
  progress?: (message: string) => void;
}

/** Evaluate the exact archived words; this path never invokes the generator. */
export async function rescoreRun(options: RescoreOptions): Promise<RunSummary> {
  const { root, input, out, id, progress } = options;
  validateRunId(id);
  const parent = await readRun(input, true);
  const { protocol, cohort } = parent.manifest;
  validateProtocol(protocol);
  const original = await readPinnedJson<SourceArchive>(input, parent.manifest, "sources.json.gz");
  if (digest(original.generator) !== parent.manifest.generator.sourceDigest ||
      digest(original.references) !== parent.manifest.referenceDigest ||
      digest({ files: original.evaluator, definitions: parent.summary.definitions }) !== parent.manifest.evaluatorDigest ||
      currentEnvironment(original.packageFiles).packageLockDigest !== parent.manifest.environment.packageLockDigest ||
      currentEnvironment(original.evaluatorPackageFiles ?? original.packageFiles).packageLockDigest !== (parent.manifest.evaluationEnvironment ?? parent.manifest.environment).packageLockDigest) {
    throw new Error("Archived sources do not match the parent provenance.");
  }
  const current = await captureSources(root);
  const sources: SourceArchive = {
    ...original,
    evaluator: current.evaluator,
    evaluatorPackageFiles: current.packageFiles,
  };
  const provenance = parent.manifest.artifacts.some(item => item.file === "provenance.json.gz")
    ? await readPinnedJson<ArchivedProvenance[]>(input, parent.manifest, "provenance.json.gz") : [];
  provenance.push({ manifest: parent.manifest, digest: digest(parent.manifest), sources: original });
  const source: DrawSource = async function* (_profile, _seed, file) {
    const expected = pinnedArtifact(parent.manifest, file);
    await copyFile(join(input, file), join(out, file), constants.COPYFILE_EXCL);
    const actual = await artifact(out, file);
    if (actual.sha256 !== expected.sha256 || actual.bytes !== expected.bytes) throw new Error(`Artifact verification failed while copying: ${file}`);
    yield* archivedDraws(join(out, file));
  };
  const { summary, files } = await evaluateCorpus({ out, id, cohort, protocol, progress }, sources, source, false);
  const after = await captureSources(root);
  if (digest({ evaluator: current.evaluator, packages: current.packageFiles }) !== digest({ evaluator: after.evaluator, packages: after.packageFiles })) {
    throw new Error("Evaluator or dependencies changed during rescoring. This run is incomplete.");
  }
  await saveJson(out, "provenance.json.gz", provenance);
  files.push("provenance.json.gz");
  const manifest: Manifest = {
    ...parent.manifest,
    id, createdAt: new Date().toISOString(), evaluatorDigest: summary.evaluatorDigest,
    evaluationEnvironment: currentEnvironment(current.packageFiles),
    rescore: { parentId: parent.manifest.id, parentManifestDigest: digest(parent.manifest), parentEvaluatorDigest: parent.manifest.evaluatorDigest },
    artifacts: await Promise.all(files.map(file => artifact(out, file))),
  };
  await saveJson(out, "manifest.json", { manifest, digest: digest(manifest) });
  return summary;
}

/** Full verification checks every archived byte; comparison needs the pinned summary. */
export async function readRun(directory: string, full = false): Promise<{ manifest: Manifest; summary: RunSummary }> {
  const envelope = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")) as { manifest: Manifest; digest: string };
  const { manifest } = envelope;
  if (manifest.schemaVersion !== 1 || digest(manifest) !== envelope.digest || digest(manifest.protocol) !== manifest.protocolDigest) {
    throw new Error("Invalid or altered quality manifest.");
  }
  if (new Set(manifest.artifacts.map(item => item.file)).size !== manifest.artifacts.length) throw new Error("Manifest contains duplicate artifact paths.");
  const records = full ? manifest.artifacts : manifest.artifacts.filter(item => item.file === "summary.json");
  if (!records.some(item => item.file === "summary.json")) throw new Error("Manifest does not pin summary.json.");
  for (const expected of records) {
    if (expected.file !== basename(expected.file) && !/^words\/[a-z0-9-]+\.jsonl\.gz$/.test(expected.file)) throw new Error("Invalid artifact path.");
    const actual = await artifact(directory, expected.file);
    if (actual.sha256 !== expected.sha256 || actual.bytes !== expected.bytes) throw new Error(`Artifact verification failed: ${expected.file}`);
  }
  const summary = JSON.parse(await readFile(join(directory, "summary.json"), "utf8")) as RunSummary;
  if (summary.id !== manifest.id || summary.cohort !== manifest.cohort || summary.protocolDigest !== manifest.protocolDigest || summary.evaluatorDigest !== manifest.evaluatorDigest || summary.referenceDigest !== manifest.referenceDigest) {
    throw new Error("Summary does not match its manifest.");
  }
  return { manifest, summary };
}
