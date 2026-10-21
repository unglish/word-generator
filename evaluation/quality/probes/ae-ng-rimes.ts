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
import type { StageSnapshot } from "../../../src/core/trace.js";
import type { Draw, SourceArchive } from "../model.js";
interface RimeCounts {
  syllables: number;
  aeNuclei: number;
  multiSegmentNuclei: number;
  closedAe: number;
  ngCodas: number;
  pairs: number;
  exactPairs: number;
  extendedPairs: number;
}
interface LayerCounts extends RimeCounts {
  observedWords: number;
  unavailableWords: number;
  pairedWords: number;
  strata: Record<string, RimeCounts>;
}
interface TransitionCounts { observedWords: number; unavailableWords: number; retained: number; introduced: number; removed: number }
interface Counts {
  words: number;
  layers: Record<"generatedBase" | "preparedBase" | "output", LayerCounts>;
  transitions: Record<"generationToPrepared" | "stressRepair", TransitionCounts>;
}
interface ObservedSyllable { onset: string[]; nucleus: string[]; coda: string[]; stress?: string }

function emptyRimes(): RimeCounts {
  return { syllables: 0, aeNuclei: 0, multiSegmentNuclei: 0, closedAe: 0, ngCodas: 0, pairs: 0, exactPairs: 0, extendedPairs: 0 };
}
export function emptyCounts(): Counts {
  const layer = (): LayerCounts => ({ ...emptyRimes(), observedWords: 0, unavailableWords: 0, pairedWords: 0, strata: {} });
  const transition = (): TransitionCounts => ({ observedWords: 0, unavailableWords: 0, retained: 0, introduced: 0, removed: 0 });
  return { words: 0, layers: { generatedBase: layer(), preparedBase: layer(), output: layer() },
    transitions: { generationToPrepared: transition(), stressRepair: transition() } };
}

function paired(syllable: ObservedSyllable): boolean {
  return syllable.nucleus.includes("æ") && syllable.coda.includes("ŋ");
}
function observeRime(counts: RimeCounts, syllable: ObservedSyllable): void {
  counts.syllables++;
  if (syllable.nucleus.length > 1) counts.multiSegmentNuclei++;
  const ae = syllable.nucleus.includes("æ");
  if (ae) counts.aeNuclei++;
  if (ae && syllable.coda.length) counts.closedAe++;
  if (syllable.coda.includes("ŋ")) counts.ngCodas++;
  if (!paired(syllable)) return;
  counts.pairs++;
  if (syllable.nucleus.length === 1 && syllable.coda.length === 1) counts.exactPairs++;
  if (syllable.coda.length > 1) counts.extendedPairs++;
}
function observeLayer(counts: LayerCounts, syllables: ObservedSyllable[] | undefined, surface: boolean): void {
  if (!syllables?.length) { counts.unavailableWords++; return; }
  counts.observedWords++;
  if (syllables.some(paired)) counts.pairedWords++;
  for (const [index, syllable] of syllables.entries()) {
    const position = syllables.length === 1 ? "only" : index === 0 ? "initial" : index === syllables.length - 1 ? "final" : "medial";
    let stress = "unavailable";
    if (surface) stress = syllable.stress === "ˈ" ? "primary" : syllable.stress === "ˌ" ? "secondary" : syllable.stress === undefined ? "unmarked" : "other";
    observeRime(counts, syllable);
    observeRime(counts.strata[`${position}/${stress}`] ??= emptyRimes(), syllable);
  }
}
function observeTransition(counts: TransitionCounts, before: ObservedSyllable[] | undefined, after: ObservedSyllable[] | undefined): void {
  if (!before?.length || !after || before.length !== after.length) { counts.unavailableWords++; return; }
  counts.observedWords++;
  for (let i = 0; i < before.length; i++) {
    const was = paired(before[i]);
    const now = paired(after[i]);
    if (was && now) counts.retained++;
    if (!was && now) counts.introduced++;
    if (was && !now) counts.removed++;
  }
}

function uniqueStage(stages: StageSnapshot[] | undefined, name: string): StageSnapshot | undefined {
  const matching = stages?.filter(stage => stage.name === name) ?? [];
  if (matching.length > 1) throw new Error(`Ambiguous duplicate stage: ${name}`);
  return matching[0];
}

export function observe(counts: Counts, draw: Draw): void {
  counts.words++;
  const stages = draw.word.trace?.stages;
  const generated = uniqueStage(stages, "generateSyllables")?.after;
  const prepared = uniqueStage(stages, "generateWrittenForm")?.before;
  const repaired = uniqueStage(stages, "repairStressedNuclei");
  observeLayer(counts.layers.generatedBase, generated, false);
  observeLayer(counts.layers.preparedBase, prepared, false);
  observeLayer(counts.layers.output, draw.word.syllables.map(syllable => ({
    onset: syllable.onset.map(phone => phone.sound), nucleus: syllable.nucleus.map(phone => phone.sound),
    coda: syllable.coda.map(phone => phone.sound), stress: syllable.stress,
  })), true);
  observeTransition(counts.transitions.generationToPrepared, generated, prepared);
  observeTransition(counts.transitions.stressRepair, repaired?.before, repaired?.after);
}

function witnessKinds(draw: Draw): string[] {
  const kinds: string[] = [];
  const stages = draw.word.trace?.stages;
  for (const [layer, syllables] of [
    ["generatedBase", uniqueStage(stages, "generateSyllables")?.after],
    ["preparedBase", uniqueStage(stages, "generateWrittenForm")?.before],
  ] as const) {
    if (syllables?.some(paired)) kinds.push(layer);
    if (syllables?.some(syllable => paired(syllable) && syllable.coda.length > 1)) kinds.push(`${layer}/extended`);
  }
  const repaired = uniqueStage(stages, "repairStressedNuclei");
  if (repaired && repaired.before.length === repaired.after.length && repaired.after.some((syllable, i) => paired(syllable) && !paired(repaired.before[i]))) kinds.push("introducedByStressRepair");
  return kinds;
}

async function localSources(root: string): Promise<SourceFile[]> {
  return Promise.all([
    "evaluation/quality/probes/ae-ng-rimes.ts",
    "evaluation/quality/probes/ae-ng-rimes-protocol.json",
  ].map(async path => ({ path, content: await readFile(join(root, path), "utf8") })));
}

async function verifyTooling(root: string, expected: SourceFile[]): Promise<void> {
  for (const file of expected) {
    if (!/^evaluation\/quality\/[^/]+\.(ts|json)$/.test(file.path)) throw new Error("Unexpected foundation source path.");
    if (await readFile(join(root, file.path), "utf8") !== file.content) throw new Error(`Frozen foundation source differs: ${file.path}`);
  }
}

export async function analyzeRimeRun(directory: string) {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const sources = await localSources(root);
  const definitions = JSON.parse(sources[1].content) as { foundationEvaluatorDigest: string };
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
          observe(counts, draw); observe(totals, draw);
          const morphology = draw.word.trace?.morphology;
          const actual = morphology && morphology.template !== "bare" && (morphology.prefix || morphology.suffix) ? morphology.template : "bare";
          observe(strata[`${actual}/syllables:${draw.word.syllables.length}`] ??= emptyCounts(), draw);
          for (const kind of witnessKinds(draw)) witnesses[`${profile.id}/${kind}`] ??= draw;
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
  const report = await analyzeRimeRun(resolve(values.run));
  const out = resolve(values.out);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(report)}\n`, { flag: "wx" });
  console.log(`Saved rime observation: ${out}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
