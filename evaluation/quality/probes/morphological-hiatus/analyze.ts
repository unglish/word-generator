import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createGunzip, gunzipSync } from "node:zlib";
import { readRun, validateProtocol } from "../../capture.js";
import { digest } from "../../serialization.js";
import type { Draw, SourceArchive } from "../../model.js";
import type { MorphHiatusDecisionTrace } from "../../../../src/core/trace.js";

const definitions = {
  id: "morphological-hiatus-v1",
  legacy: "Fallback events are positive insertion evidence; historical traces without decision support do not enumerate all eligible boundaries.",
  candidate: "Decisions report vowel-adjacent morphology boundaries before the final morphology pronunciation pass. Root vowels may already be reduced. Final structural checks allow subsequent vowel reduction.",
  denominators: "Word counts use actual affixed outputs. Boundary outcomes use observed decision events, never all generated words. Historical opportunity counts are unknown.",
  rootEvents: "vowelHiatusFallback events are within-root and remain separate from morphology.",
  correspondence: "Mismatch counts are distinct boundary/coordinate groups without a one-to-one insertion-decision/fallback-event match. Historical sources without decision emission remain unknown.",
};

export function emptyCounts() {
  return {
    words: 0, affixedWords: 0, unavailableStructuralWords: 0,
    decisionCoverage: { availableAffixedWords: 0, unknownAffixedWords: 0 },
    bridgeWords: 0, bridgeEvents: { "prefix-root": 0, "root-suffix": 0 },
    bridgeSounds: {} as Record<string, number>, rootBridgeEvents: 0,
    decisions: { "prefix-root": 0, "root-suffix": 0 },
    outcomes: { preserved: 0, inserted: 0, "no-bridge-candidate": 0 },
    nucleusPairs: {} as Record<string, number>, finalStructureMismatches: 0,
    decisionInsertionEventMismatches: 0, surfaceVowelBoundaries: 0,
  };
}
type Counts = ReturnType<typeof emptyCounts>;
function increment(values: Record<string, number>, key: string): void { values[key] = (values[key] ?? 0) + 1; }

function actualMorphology(draw: Draw): string {
  const morphology = draw.word.trace?.morphology;
  return morphology && (morphology.prefix || morphology.suffix) ? morphology.template : "bare";
}

export function observe(counts: Counts, draw: Draw, supportsDecisions: boolean): void {
  counts.words++;
  const affixed = actualMorphology(draw) !== "bare";
  const structural = draw.word.trace?.structural;
  if (affixed) {
    counts.affixedWords++;
    if (supportsDecisions && structural) counts.decisionCoverage.availableAffixedWords++;
    else counts.decisionCoverage.unknownAffixedWords++;
  }
  const syllables = draw.word.syllables;
  for (let index = 1; index < syllables.length; index++) {
    if (syllables[index - 1].coda.length === 0 && syllables[index].onset.length === 0 && syllables[index - 1].nucleus.length > 0 && syllables[index].nucleus.length > 0) counts.surfaceVowelBoundaries++;
  }
  if (!structural) { counts.unavailableStructuralWords++; return; }
  const bridges = structural.filter(event => event.event === "morphPrefixHiatusFallback" || event.event === "morphSuffixHiatusFallback");
  if (bridges.length) counts.bridgeWords++;
  for (const event of structural) {
    if (event.event === "vowelHiatusFallback") counts.rootBridgeEvents++;
    if (event.event === "morphPrefixHiatusFallback" || event.event === "morphSuffixHiatusFallback") {
      counts.bridgeEvents[event.event === "morphPrefixHiatusFallback" ? "prefix-root" : "root-suffix"]++;
      increment(counts.bridgeSounds, event.inserted);
    }
    if (event.event !== "morphHiatusDecision") continue;
    counts.decisions[event.boundary]++;
    counts.outcomes[event.outcome]++;
    increment(counts.nucleusPairs, `${event.boundary}:${event.leftNucleus.join("+")}→${event.rightNucleus.join("+")}`);
    const left = syllables[event.leftSyllableIndex];
    const right = syllables[event.rightSyllableIndex];
    const intact = left && right && event.rightSyllableIndex === event.leftSyllableIndex + 1 && left.coda.length === 0 && left.nucleus.length > 0 && right.nucleus.length > 0;
    const expectedOnset = event.outcome === "inserted"
      ? right?.onset.length === 1 && right.onset[0].sound === event.inserted
      : right?.onset.length === 0;
    if (!intact || !expectedOnset) counts.finalStructureMismatches++;
  }
  if (!supportsDecisions) return;
  const groups = new Map<string, { decisions: MorphHiatusDecisionTrace[]; sounds: string[] }>();
  const group = (boundary: string, index: number) => {
    const key = `${boundary}:${index}`;
    if (!groups.has(key)) groups.set(key, { decisions: [], sounds: [] });
    return groups.get(key)!;
  };
  for (const event of structural) {
    if (event.event === "morphHiatusDecision") group(event.boundary, event.rightSyllableIndex).decisions.push(event);
    if (event.event === "morphPrefixHiatusFallback" || event.event === "morphSuffixHiatusFallback") group(event.event === "morphPrefixHiatusFallback" ? "prefix-root" : "root-suffix", event.syllableIndex).sounds.push(event.inserted);
  }
  for (const { decisions, sounds } of groups.values()) {
    const decision = decisions[0];
    const matches = decisions.length === 1 && (decision.outcome === "inserted"
      ? sounds.length === 1 && sounds[0] === decision.inserted
      : sounds.length === 0);
    if (!matches) counts.decisionInsertionEventMismatches++;
  }
}

export async function analyze(directory: string) {
  const { manifest, summary } = await readRun(directory, true);
  validateProtocol(manifest.protocol);
  if (manifest.cohort !== "development" && manifest.cohort !== "validation") throw new Error("Invalid cohort.");
  if (!manifest.artifacts.some(artifact => artifact.file === "sources.json.gz")) throw new Error("Unpinned source archive.");
  const expectedProfiles = manifest.protocol.profiles.map(profile => profile.id).sort();
  if (JSON.stringify(expectedProfiles) !== JSON.stringify(summary.profiles.map(profile => profile.id).sort())) throw new Error("Summary profiles do not match protocol.");
  const expectedShards = manifest.protocol.profiles.flatMap(profile => profile.seeds[manifest.cohort].map(seed => `words/${profile.id}-${seed}.jsonl.gz`)).sort();
  const pinnedShards = manifest.artifacts.filter(artifact => artifact.file.startsWith("words/")).map(artifact => artifact.file).sort();
  const actualShards = (await readdir(join(directory, "words"))).map(file => `words/${file}`).sort();
  if (JSON.stringify(expectedShards) !== JSON.stringify(pinnedShards) || JSON.stringify(expectedShards) !== JSON.stringify(actualShards)) throw new Error("Archive shard set does not match protocol.");
  const sources = JSON.parse(gunzipSync(await readFile(join(directory, "sources.json.gz"))).toString()) as SourceArchive;
  if (digest(sources.generator) !== manifest.generator.sourceDigest) throw new Error("Generator source fingerprint mismatch.");
  const declaration = sources.generator.find(source => source.path === "src/core/trace.ts")?.content;
  const emitter = sources.generator.find(source => source.path === "src/core/morphology/attach.ts")?.content;
  const supportsDecisions = !!declaration?.includes("event: \"morphHiatusDecision\";")
    && !!emitter?.includes("event: \"morphHiatusDecision\",")
    && (emitter?.match(/realizeBoundaryHiatus\(/g)?.length ?? 0) === 3;
  const witnesses: Record<string, Draw> = {};
  const profiles = [];
  for (const profile of manifest.protocol.profiles) {
    const totals = emptyCounts();
    const strata: Record<string, Counts> = {};
    const replicates = [];
    const recorded = summary.profiles.find(item => item.id === profile.id)!;
    const expectedSeeds = [...profile.seeds[manifest.cohort]].sort((a, b) => a - b);
    if (JSON.stringify(expectedSeeds) !== JSON.stringify(recorded.replicates.map(item => item.seed).sort((a, b) => a - b))) throw new Error("Summary replicate schedule does not match protocol.");
    for (const seed of profile.seeds[manifest.cohort]) {
      const counts = emptyCounts();
      const file = `words/${profile.id}-${seed}.jsonl.gz`;
      if (!manifest.artifacts.some(artifact => artifact.file === file)) throw new Error(`Unpinned raw stream: ${file}`);
      const compressed = createReadStream(join(directory, file));
      const gunzip = createGunzip();
      compressed.on("error", error => gunzip.destroy(error));
      const lines = createInterface({ input: compressed.pipe(gunzip), crlfDelay: Infinity });
      try {
        for await (const line of lines) {
          const draw = JSON.parse(line) as Draw;
          if (draw.profile !== profile.id || draw.seed !== seed || draw.drawIndex !== counts.words || counts.words >= manifest.protocol.wordsPerReplicate) throw new Error(`Invalid draw order in ${file}`);
          observe(counts, draw, supportsDecisions);
          observe(totals, draw, supportsDecisions);
          const stratum = `${actualMorphology(draw)}:${draw.word.syllables.length}`;
          observe(strata[stratum] ??= emptyCounts(), draw, supportsDecisions);
          for (const event of draw.word.trace?.structural ?? []) {
            if (event.event === "morphHiatusDecision") {
              const typed: MorphHiatusDecisionTrace = event;
              witnesses[`${profile.id}:${typed.boundary}:${typed.outcome}`] ??= draw;
            } else if (event.event === "morphPrefixHiatusFallback" || event.event === "morphSuffixHiatusFallback") {
              witnesses[`${profile.id}:${event.event}`] ??= draw;
            }
          }
        }
      } finally { lines.close(); compressed.destroy(); gunzip.destroy(); }
      if (counts.words !== manifest.protocol.wordsPerReplicate) throw new Error(`Incomplete stream: ${file}`);
      if (counts.words !== recorded.replicates.find(item => item.seed === seed)!.words) throw new Error(`Summary replicate count mismatch: ${file}`);
      replicates.push({ seed, counts });
    }
    if (totals.words !== recorded.words) throw new Error(`Summary profile count mismatch: ${profile.id}`);
    profiles.push({ id: profile.id, counts: totals, strata, replicates });
  }
  return { id: definitions.id, definitions, runId: manifest.id, inputManifestDigest: digest(manifest), generatorDigest: manifest.generator.sourceDigest, protocolDigest: manifest.protocolDigest, supportsDecisions, profiles, witnesses };
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { run: { type: "string" }, out: { type: "string" } } });
  if (!values.run || !values.out) throw new Error("--run and --out are required");
  const report = await analyze(resolve(values.run));
  const sourceFiles = await Promise.all([fileURLToPath(import.meta.url), resolve("evaluation/quality/capture.ts"), resolve("evaluation/quality/serialization.ts")].map(async path => ({ path: path.split("/evaluation/")[1], content: await readFile(path, "utf8") })));
  const artifact = { ...report, probeDigest: digest(sourceFiles), probeSources: sourceFiles };
  await mkdir(dirname(resolve(values.out)), { recursive: true });
  await writeFile(resolve(values.out), JSON.stringify(artifact, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ run: report.runId, probeDigest: artifact.probeDigest, profiles: report.profiles.map(profile => ({ id: profile.id, ...profile.counts })) }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
