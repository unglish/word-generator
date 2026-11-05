import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const sha = value => createHash("sha256").update(value).digest("hex");
function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalJson(value[key])]));
  }
  return value;
}
export const digest = value => sha(JSON.stringify(canonicalJson(value)));
const add = (counts, key, amount = 1) => { counts[key] = (counts[key] ?? 0) + amount; };
const empty = () => ({ counts: {}, extensions: {}, rejections: {}, stages: {}, clusters: {}, separatedRepeats: {}, alternations: {} });
const sounds = coda => coda.map(phoneme => typeof phoneme === "string" ? phoneme : phoneme.sound);
const adjacentPairs = coda => coda.reduce((count, sound, index) => count + Number(index > 0 && sound === coda[index - 1]), 0);
const duplicates = syllables => syllables.reduce((count, syllable) => count + adjacentPairs(sounds(syllable.coda)), 0);
const separatedRepeat = coda => coda.some((sound, index) => coda.slice(index + 2).includes(sound));

function morphology(word) {
  const applied = word.trace.morphology;
  return applied?.prefix ? applied.suffix ? "both" : "prefix" : applied?.suffix ? "suffix" : "none";
}

export function observe(group, draw, attested) {
  const { word } = draw;
  assert.ok(word.trace, "Every archived word requires a trace");
  const count = group.counts;
  add(count, "words");
  const finalDuplicates = duplicates(word.syllables);
  add(count, "duplicatePairs", finalDuplicates);
  add(count, "duplicateWords", Number(finalDuplicates > 0));
  for (const syllable of word.syllables) {
    const coda = sounds(syllable.coda);
    add(count, "syllables");
    add(count, "codaBearingSyllables", Number(coda.length > 0));
    if (coda.length < 2) continue;
    const key = coda.join("|");
    const cluster = group.clusters[key] ??= { count: 0, attested: attested.has(key) };
    cluster.count++;
    add(count, "multiSegmentCodas");
    add(count, "attestedMultiSegmentCodas", Number(cluster.attested));
    if (separatedRepeat(coda)) {
      add(group.separatedRepeats, key);
      add(count, "separatedRepeatCodas");
      add(count, "attestedSeparatedRepeatCodas", Number(cluster.attested));
    }
  }
  const generated = word.trace.stages.find(stage => stage.name === "generateSyllables")?.after;
  for (const event of word.trace.structural) {
    if (event.event === "finalS" || event.event === "nasalStopExtension") {
      add(group.extensions, event.event);
      add(group.extensions, `${event.event}/probability:${event.probability}`);
      if (event.event === "finalS") {
        const coda = generated?.[event.syllableIndex]?.coda;
        if (coda?.at(-1) === "s" && coda.at(-2) === "s") add(count, "generatedDuplicateWithFinalSAtSameSyllable");
      }
    } else if (event.event === "codaExtensionRejected") {
      add(group.rejections, `${event.extension}/${event.reason}`);
    }
  }
  for (const stage of word.trace.stages) {
    const stats = group.stages[stage.name] ??= {};
    const before = duplicates(stage.before);
    const after = duplicates(stage.after);
    add(stats, "words");
    add(stats, "beforePairs", before);
    add(stats, "afterPairs", after);
    add(stats, "wordsWithIncreasedPairCount", Number(after > before));
    add(stats, "positivePairCountChange", Math.max(0, after - before));
    add(stats, "negativePairCountChange", Math.max(0, before - after));
  }
  const lastStage = word.trace.stages.at(-1);
  if (lastStage && finalDuplicates > 0 && duplicates(lastStage.after) === 0) {
    add(count, "postPipelineDuplicateWords");
    for (const change of word.trace.morphology?.alternations ?? []) {
      add(group.alternations, `${change.boundary}/${change.rule}/${change.soundBefore ?? ""}→${change.soundAfter ?? ""}`);
    }
  }
}

function remember(examples, key, draw) {
  const list = examples[key] ??= [];
  if (list.length < 3) list.push(draw);
}

async function readPinned(directory, manifest, file) {
  const artifact = manifest.artifacts.find(item => item.file === file);
  assert.ok(artifact, `Unpinned artifact ${file}`);
  const bytes = await readFile(join(directory, file));
  assert.equal(bytes.length, artifact.bytes, `Artifact size mismatch: ${file}`);
  assert.equal(sha(bytes), artifact.sha256, `Artifact checksum mismatch: ${file}`);
  return bytes;
}

export async function analyzeRun(directory) {
  const manifestBytes = await readFile(join(directory, "manifest.json"));
  const envelope = JSON.parse(manifestBytes);
  const { manifest } = envelope;
  assert.equal(digest(manifest), envelope.digest, "Manifest checksum mismatch");
  assert.equal(digest(manifest.protocol), manifest.protocolDigest, "Protocol checksum mismatch");
  assert.equal(manifest.cohort, "development", "This development probe does not inspect validation words");
  const summary = JSON.parse(await readPinned(directory, manifest, "summary.json"));
  const attested = new Set(manifest.generator.effectiveConfig.clusterLimits.attestedCodas.map(cluster => cluster.join("|")));
  const shards = manifest.protocol.profiles.flatMap(profile => profile.seeds.development.map(seed => ({ profile: profile.id, seed, file: `words/${profile.id}-${seed}.jsonl.gz` })));
  assert.deepEqual(manifest.artifacts.filter(item => item.file.startsWith("words/")).map(item => item.file).sort(), shards.map(item => item.file).sort(), "Unexpected manifest shard set");
  assert.deepEqual((await readdir(join(directory, "words"))).sort(), shards.map(item => item.file.slice(6)).sort(), "Unexpected word directory contents");
  const total = empty();
  const profiles = {};
  const strata = {};
  const replicates = {};
  const examples = {};
  for (const shard of shards) {
    const compressed = await readPinned(directory, manifest, shard.file);
    const lines = gunzipSync(compressed).toString("utf8").trimEnd().split("\n");
    assert.equal(lines.length, manifest.protocol.wordsPerReplicate, `Incorrect draw count: ${shard.file}`);
    const replicate = replicates[`${shard.profile}/${shard.seed}`] = empty();
    const profile = profiles[shard.profile] ??= empty();
    for (let index = 0; index < lines.length; index++) {
      const draw = JSON.parse(lines[index]);
      assert.equal(draw.profile, shard.profile);
      assert.equal(draw.seed, shard.seed);
      assert.equal(draw.drawIndex, index);
      const actualMorphology = morphology(draw.word);
      const stratum = strata[`${draw.profile}/${actualMorphology}`] ??= empty();
      for (const group of [total, profile, stratum, replicate]) observe(group, draw, attested);
      if (duplicates(draw.word.syllables)) remember(examples, `duplicate/${draw.profile}/${actualMorphology}`, draw);
      for (const syllable of draw.word.syllables) {
        const coda = sounds(syllable.coda);
        if (separatedRepeat(coda)) remember(examples, `separated-repeat/${coda.join("|")}`, draw);
      }
      for (const event of draw.word.trace.structural) {
        if (event.event === "codaExtensionRejected") remember(examples, `rejected/${event.extension}/${event.reason}`, draw);
        if (event.event === "finalS" || event.event === "nasalStopExtension") remember(examples, `accepted/${event.event}`, draw);
      }
    }
  }
  for (const profile of summary.profiles) {
    assert.equal(profiles[profile.id].counts.words, profile.words, "Supplemental word denominator disagrees with frozen evaluator");
    assert.equal(profiles[profile.id].counts.duplicateWords, profile.metrics.adjacent_duplicate_coda.hits, "Supplemental duplicate count disagrees with frozen evaluator");
  }
  const sources = JSON.parse(gunzipSync(await readPinned(directory, manifest, "sources.json.gz")));
  const recordsRejections = sources.generator.some(file => file.path.endsWith("generate.ts") && file.content.includes('event: "codaExtensionRejected"'));
  return {
    directory, id: manifest.id, manifestFileDigest: sha(manifestBytes), manifestDigest: envelope.digest,
    protocolDigest: manifest.protocolDigest, evaluatorDigest: manifest.evaluatorDigest, referenceDigest: manifest.referenceDigest,
    sourceDigest: manifest.generator.sourceDigest, rejectedExtensionInstrumentation: recordsRejections ? "available" : "historically-unobserved",
    total, profiles, strata, replicates, examples,
  };
}

async function main() {
  const [baselinePath, candidatePath, output] = process.argv.slice(2);
  assert.ok(baselinePath && candidatePath && output, "Usage: node analyze.mjs BASELINE CANDIDATE OUTPUT");
  const baseline = await analyzeRun(resolve(baselinePath));
  const candidate = await analyzeRun(resolve(candidatePath));
  for (const key of ["protocolDigest", "evaluatorDigest", "referenceDigest"]) assert.equal(baseline[key], candidate[key], `Incompatible ${key}`);
  const path = fileURLToPath(import.meta.url);
  const report = {
    probeVersion: 1, sourceDigest: sha(await readFile(path)), preregistrationDigest: sha(await readFile(join(dirname(path), "README.md"))),
    baseline, candidate,
  };
  await mkdir(dirname(resolve(output)), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ output, baselineWords: baseline.total.counts.words, candidateWords: candidate.total.counts.words }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
