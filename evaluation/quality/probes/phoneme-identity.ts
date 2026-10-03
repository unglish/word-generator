import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createGunzip, gunzipSync } from "node:zlib";
import { readRun, validateProtocol } from "../capture.js";
import { digest } from "../serialization.js";
import type { SourceFile } from "../serialization.js";
import type { Draw, SourceArchive } from "../model.js";
import { observeWordIdentity, projectIdentityStress, projectLegacyArpabet } from "../../../src/phonology/identity.js";
import type { WordIdentityObservation } from "../../../src/phonology/identity.js";

interface Counts {
  words: number;
  syllables: number;
  segments: number;
  identities: { resolved: number; ambiguous: number; unknown: number };
  coarse: { mapped: number; missing: number; completeWords: number; mergeCapable: number; aspirationLoss: number };
  strict: { identityCompleteWords: number; stressCompleteWords: number; structureSupportedWords: number; completeWords: number };
  sourceCounts: Record<string, number>;
  ambiguous: Record<string, number>;
  unknown: Record<string, number>;
  notationAliases: Record<string, number>;
  coarsePreimages: Record<string, Record<string, number>>;
  stressByNucleus: Record<string, Record<string, number>>;
  reductionFlags: { true: number; false: number; unknown: number };
  underlyingIdentityUnknown: number;
  preparedBaseTraceWords: number;
}

function emptyCounts(): Counts {
  return { words: 0, syllables: 0, segments: 0, identities: { resolved: 0, ambiguous: 0, unknown: 0 },
    coarse: { mapped: 0, missing: 0, completeWords: 0, mergeCapable: 0, aspirationLoss: 0 },
    strict: { identityCompleteWords: 0, stressCompleteWords: 0, structureSupportedWords: 0, completeWords: 0 },
    sourceCounts: {}, ambiguous: {}, unknown: {}, notationAliases: {}, coarsePreimages: {}, stressByNucleus: {},
    reductionFlags: { true: 0, false: 0, unknown: 0 }, underlyingIdentityUnknown: 0, preparedBaseTraceWords: 0 };
}

function increment(counts: Record<string, number>, key: string): void {
  // JSON keys preserve the entire raw symbol, including unsupported prototype-like strings.
  const encoded = JSON.stringify(key);
  counts[encoded] = (counts[encoded] ?? 0) + 1;
}

function observe(counts: Counts, draw: Draw, observed: WordIdentityObservation): void {
  const coarse = projectLegacyArpabet(observed);
  const strict = projectIdentityStress(observed);
  counts.words++;
  counts.syllables += observed.syllables.length;
  counts.segments += observed.segments.length;
  if (coarse.complete) counts.coarse.completeWords++;
  if (strict.identityComplete) counts.strict.identityCompleteWords++;
  if (strict.stressComplete) counts.strict.stressCompleteWords++;
  if (strict.structureSupported) counts.strict.structureSupportedWords++;
  if (strict.identityComplete && strict.stressComplete && strict.structureSupported) counts.strict.completeWords++;
  if (draw.word.trace?.stages.some(stage => stage.name === "generateWrittenForm")) counts.preparedBaseTraceWords++;
  for (const [i, segment] of observed.segments.entries()) {
    counts.identities[segment.identity.status]++;
    increment(counts.sourceCounts, segment.rawSound);
    if (segment.identity.status === "ambiguous") increment(counts.ambiguous, segment.rawSound);
    if (segment.identity.status === "unknown") increment(counts.unknown, segment.rawSound);
    if (segment.notationAlias) increment(counts.notationAliases, segment.rawSound);
    const projected = coarse.items[i];
    if (projected.token === null) counts.coarse.missing++;
    else {
      counts.coarse.mapped++;
      increment(counts.coarsePreimages[projected.token] ??= {}, segment.rawSound);
    }
    if (projected.losses.mergedIdentity) counts.coarse.mergeCapable++;
    if (projected.losses.aspiration) counts.coarse.aspirationLoss++;
    if (segment.coordinates.slot === "nucleus") {
      increment(counts.stressByNucleus[JSON.stringify(segment.rawSound)] ??= {}, segment.stress.mark);
      const reduced = segment.recorded.reduction;
      if (reduced.status === "unknown") counts.reductionFlags.unknown++;
      else if (reduced.value) counts.reductionFlags.true++;
      else counts.reductionFlags.false++;
    }
    counts.underlyingIdentityUnknown++;
  }
  if (counts.segments !== counts.identities.resolved + counts.identities.ambiguous + counts.identities.unknown ||
      counts.segments !== counts.coarse.mapped + counts.coarse.missing) throw new Error("Segment accounting failed.");
}

async function localSources(root: string): Promise<SourceFile[]> {
  return Promise.all([
    "src/phonology/identity.ts", "evaluation/quality/probes/phoneme-identity.ts",
    "evaluation/quality/probes/phoneme-identity-protocol.json",
  ].map(async path => ({ path, content: await readFile(join(root, path), "utf8") })));
}

async function verifyTooling(root: string, expected: SourceFile[]): Promise<void> {
  for (const file of expected) {
    if (!/^evaluation\/quality\/[^/]+\.(ts|json)$/.test(file.path)) throw new Error("Unexpected foundation source path.");
    if (await readFile(join(root, file.path), "utf8") !== file.content) throw new Error(`Frozen foundation source differs: ${file.path}`);
  }
}

export async function analyzeIdentityRun(directory: string) {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const sources = await localSources(root);
  const definitions = JSON.parse(sources[2].content) as { foundationEvaluatorDigest: string };
  const { manifest, summary } = await readRun(directory, true);
  validateProtocol(manifest.protocol);
  if (manifest.cohort !== "development") throw new Error("This preregistered probe uses development archives only.");
  if (!manifest.artifacts.some(artifact => artifact.file === "sources.json.gz")) throw new Error("The source archive must be pinned.");
  const sourceArchive = JSON.parse(gunzipSync(await readFile(join(directory, "sources.json.gz"))).toString("utf8")) as SourceArchive;
  if (digest(sourceArchive.generator) !== manifest.generator.sourceDigest) throw new Error("Archived generator source mismatch.");
  if (manifest.evaluatorDigest !== definitions.foundationEvaluatorDigest ||
      digest({ files: sourceArchive.evaluator, definitions: summary.definitions }) !== definitions.foundationEvaluatorDigest) {
    throw new Error("The pinned standalone foundation evaluator is required.");
  }
  await verifyTooling(root, sourceArchive.evaluator);
  const expectedSchedule = manifest.protocol.profiles.map(profile => ({
    id: profile.id, words: profile.seeds.development.length * manifest.protocol.wordsPerReplicate,
    replicates: profile.seeds.development.map(seed => ({ seed, words: manifest.protocol.wordsPerReplicate })),
  }));
  const summarySchedule = summary.profiles.map(profile => ({ id: profile.id, words: profile.words,
    replicates: profile.replicates.map(replicate => ({ seed: replicate.seed, words: replicate.words })) }));
  if (digest(summarySchedule) !== digest(expectedSchedule)) throw new Error("Summary profile/replicate schedule mismatch.");
  const expectedShards = manifest.protocol.profiles.flatMap(profile => profile.seeds.development.map(seed => `words/${profile.id}-${seed}.jsonl.gz`)).sort();
  const pinnedShards = manifest.artifacts.filter(artifact => artifact.file.startsWith("words/")).map(artifact => artifact.file).sort();
  const actualShards = (await readdir(join(directory, "words"))).map(file => `words/${file}`).sort();
  if (digest(expectedShards) !== digest(pinnedShards) || digest(expectedShards) !== digest(actualShards)) throw new Error("Expected, pinned and filesystem shard sets differ.");
  const witnesses: Record<string, Draw> = {};
  const profiles = [];
  for (const profile of manifest.protocol.profiles) {
    const totals = emptyCounts();
    const strata: Record<string, Counts> = {};
    const replicates = [];
    for (const seed of profile.seeds[manifest.cohort]) {
      const counts = emptyCounts();
      const file = `words/${profile.id}-${seed}.jsonl.gz`;
      if (!manifest.artifacts.some(artifact => artifact.file === file)) throw new Error(`Unpinned stream: ${file}`);
      const compressed = createReadStream(join(directory, file));
      const gunzip = createGunzip();
      compressed.on("error", error => gunzip.destroy(error));
      const lines = createInterface({ input: compressed.pipe(gunzip), crlfDelay: Infinity });
      try {
        for await (const line of lines) {
          const draw = JSON.parse(line) as Draw;
          if (draw.profile !== profile.id || draw.seed !== seed || draw.drawIndex !== counts.words || counts.words >= manifest.protocol.wordsPerReplicate) {
            throw new Error(`Invalid draw identity/order in ${file}.`);
          }
          const observed = observeWordIdentity(draw.word, { sourceProfile: "english-legacy-v1", layer: "surface" });
          observe(counts, draw, observed); observe(totals, draw, observed);
          const morphology = draw.word.trace?.morphology;
          const actual = morphology && morphology.template !== "bare" && (morphology.prefix || morphology.suffix) ? morphology.template : "bare";
          observe(strata[`${actual}/syllables:${draw.word.syllables.length}`] ??= emptyCounts(), draw, observed);
          for (const segment of observed.segments) {
            if (["ə", "ʌ", "ɜ", "ɚ"].includes(segment.rawSound) && segment.coordinates.slot === "nucleus") {
              witnesses[`${profile.id}/${segment.rawSound}/${segment.stress.mark}`] ??= draw;
            }
            if (segment.identity.status === "unknown") witnesses[`${profile.id}/unknown`] ??= draw;
          }
        }
      } finally {
        lines.close(); compressed.destroy(); gunzip.destroy();
      }
      if (counts.words !== manifest.protocol.wordsPerReplicate) throw new Error(`Incomplete stream: ${file}`);
      replicates.push({ seed, counts });
    }
    profiles.push({ id: profile.id, totals, replicates, strata });
  }
  const measuredSchedule = profiles.map(profile => ({ id: profile.id, words: profile.totals.words,
    replicates: profile.replicates.map(replicate => ({ seed: replicate.seed, words: replicate.counts.words })) }));
  if (digest(measuredSchedule) !== digest(expectedSchedule)) throw new Error("Measured profile/replicate schedule mismatch.");
  const after = await readRun(directory, true);
  if (digest(after.manifest) !== digest(manifest)) throw new Error("Archive provenance changed during observation.");
  if (digest(await localSources(root)) !== digest(sources)) throw new Error("Observer sources changed during observation.");
  await verifyTooling(root, sourceArchive.evaluator);
  return { schemaVersion: 1, definitions, observer: { digest: digest(sources), sources },
    run: { id: manifest.id, manifestDigest: digest(manifest), generatorCommit: manifest.generator.commit, generatorSourceDigest: manifest.generator.sourceDigest,
      generatorDirty: manifest.generator.dirty, protocolDigest: manifest.protocolDigest, referenceDigest: manifest.referenceDigest,
      evaluatorDigest: manifest.evaluatorDigest, environment: manifest.environment,
      rawArchives: manifest.artifacts.filter(artifact => artifact.file.startsWith("words/")) },
    profiles, witnesses };
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { run: { type: "string" }, out: { type: "string" } } });
  if (!values.run || !values.out) throw new Error("--run and --out are required.");
  const report = await analyzeIdentityRun(resolve(values.run));
  const out = resolve(values.out);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(report)}\n`, { flag: "wx" });
  console.log(`Saved identity observation: ${out}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
