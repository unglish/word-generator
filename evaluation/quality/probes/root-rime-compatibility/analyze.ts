import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { createGunzip, gunzipSync } from "node:zlib";
import { readRun, validateProtocol } from "../../capture.js";
import type { Draw, Manifest, SourceArchive } from "../../model.js";
import { digest } from "../../serialization.js";
import { emptyObservation, observe, pairSet, reconcile } from "./observe.js";
import type { Observation, PairRule } from "./observe.js";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const sha = (value: Buffer): string => createHash("sha256").update(value).digest("hex");
async function observerSources() {
  return Promise.all(["protocol.json", "observe.ts", "analyze.ts"].map(async file => {
    const path = `evaluation/quality/probes/root-rime-compatibility/${file}`;
    return { path, content: await readFile(join(root, path), "utf8") };
  }));
}
async function pinnedBytes(directory: string, manifest: Manifest, file: string): Promise<Buffer> {
  const matches = manifest.artifacts.filter(artifact => artifact.file === file);
  assert.equal(matches.length, 1, `Missing or duplicate pinned artifact: ${file}`);
  const bytes = await readFile(join(directory, file));
  assert.equal(bytes.length, matches[0].bytes, `Wrong byte length: ${file}`);
  assert.equal(sha(bytes), matches[0].sha256, `Wrong checksum: ${file}`);
  return bytes;
}
async function* draws(bytes: Buffer): AsyncGenerator<Draw> {
  const input = Readable.from([bytes]);
  const stream = input.pipe(createGunzip()); stream.setEncoding("utf8");
  let pending = "";
  try {
    for await (const chunk of stream) {
      pending += chunk;
      let end: number;
      while ((end = pending.indexOf("\n")) >= 0) {
        yield JSON.parse(pending.slice(0, end)) as Draw;
        pending = pending.slice(end + 1);
      }
    }
    if (pending) yield JSON.parse(pending) as Draw;
  } finally { input.destroy(); stream.destroy(); }
}
export async function analyzeRun(directory: string, mode: "original" | "control" | "candidate") {
  const sources = await observerSources();
  const protocol = JSON.parse(sources[0].content) as { foundationEvaluatorDigest: string };
  const { manifest, summary } = await readRun(directory, true);
  validateProtocol(manifest.protocol); assert.equal(manifest.cohort, "development");
  const archive = JSON.parse(gunzipSync(await pinnedBytes(directory, manifest, "sources.json.gz")).toString("utf8")) as SourceArchive;
  assert.equal(digest(archive.generator), manifest.generator.sourceDigest, "Generator source digest differs");
  assert.equal(digest(archive.references), manifest.referenceDigest, "Reference digest differs");
  const lock = archive.packageFiles.filter(file => file.path === "package-lock.json");
  assert.equal(lock.length, 1, "Missing or duplicate dependency lock");
  assert.equal(digest(lock[0].content), manifest.environment.packageLockDigest);
  const evaluatorLock = (archive.evaluatorPackageFiles ?? archive.packageFiles).filter(file => file.path === "package-lock.json");
  assert.equal(evaluatorLock.length, 1, "Missing or duplicate evaluator lock");
  assert.equal(digest(evaluatorLock[0].content), (manifest.evaluationEnvironment ?? manifest.environment).packageLockDigest);
  assert.equal(manifest.evaluatorDigest, protocol.foundationEvaluatorDigest, "Wrong foundation evaluator");
  assert.equal(digest({ files: archive.evaluator, definitions: summary.definitions }), protocol.foundationEvaluatorDigest);
  for (const file of archive.evaluator) {
    assert.match(file.path, /^evaluation\/quality\/[^/]+\.(ts|json)$/);
    assert.equal(await readFile(join(root, file.path), "utf8"), file.content, `Frozen evaluator changed: ${file.path}`);
  }
  const expectedSchedule = manifest.protocol.profiles.map(profile => ({ id: profile.id,
    words: profile.seeds.development.length * manifest.protocol.wordsPerReplicate,
    replicates: profile.seeds.development.map(seed => ({ seed, words: manifest.protocol.wordsPerReplicate })) }));
  const observedSchedule = summary.profiles.map(profile => ({ id: profile.id, words: profile.words,
    replicates: profile.replicates.map(replicate => ({ seed: replicate.seed, words: replicate.words })) }));
  assert.deepEqual(observedSchedule, expectedSchedule, "Summary schedule differs");
  const expectedShards = manifest.protocol.profiles.flatMap(profile => profile.seeds.development.map(seed => `words/${profile.id}-${seed}.jsonl.gz`)).sort();
  assert.deepEqual(manifest.artifacts.filter(item => item.file.startsWith("words/")).map(item => item.file).sort(), expectedShards, "Pinned shard set differs");
  assert.deepEqual((await readdir(join(directory, "words"))).map(file => `words/${file}`).sort(), expectedShards, "Filesystem shard set differs");
  const config = manifest.generator.effectiveConfig as { codaConstraints?: { bannedNucleusCodaCombinations?: PairRule[] } };
  const rules = config.codaConstraints?.bannedNucleusCodaCombinations ?? [];
  for (const rule of rules) for (const group of [rule.nucleus, rule.coda]) assert.ok(Array.isArray(group) && group.every(sound => typeof sound === "string"));
  const pairs = pairSet(rules), witnesses: Record<string, Draw[]> = {}, profiles = [];
  for (const profile of manifest.protocol.profiles) {
    const totals = emptyObservation(), replicates = [], strata: Record<string, Observation> = {};
    for (const seed of profile.seeds.development) {
      const counts = emptyObservation();
      const file = `words/${profile.id}-${seed}.jsonl.gz`;
      for await (const draw of draws(await pinnedBytes(directory, manifest, file))) {
        assert.equal(draw.profile, profile.id); assert.equal(draw.seed, seed);
        assert.equal(draw.drawIndex, counts.words, "Draw index/order differs");
        assert.ok(counts.words < manifest.protocol.wordsPerReplicate, "Extra draw");
        const kinds = observe(draw, counts, pairs, mode === "candidate");
        observe(draw, totals, pairs, mode === "candidate");
        const morphology = draw.word.trace?.morphology;
        const applied = morphology?.prefix ? morphology.suffix ? "both" : "prefix" : morphology?.suffix ? "suffix" : "bare";
        observe(draw, strata[applied] ??= emptyObservation(), pairs, mode === "candidate");
        for (const kind of kinds) {
          const list = witnesses[`${profile.id}/${kind}`] ??= [];
          if (list.length < 3) list.push(draw);
        }
      }
      assert.equal(counts.words, manifest.protocol.wordsPerReplicate, "Incomplete stream"); reconcile(counts);
      replicates.push({ seed, counts });
    }
    reconcile(totals); Object.values(strata).forEach(reconcile);
    assert.equal(totals.words, profile.seeds.development.length * manifest.protocol.wordsPerReplicate);
    if (mode === "candidate") {
      assert.equal(totals.layers.preparedRoot.observedWords, totals.words, "Candidate lexical root observation missing");
      assert.equal(totals.layers.preparedRoot.violatingPairs, 0, "Candidate lexical-root pair postcondition failed");
    }
    profiles.push({ id: profile.id, totals, replicates, strata });
  }
  assert.equal(digest((await readRun(directory, true)).manifest), digest(manifest), "Archive changed during observation");
  assert.deepEqual(await observerSources(), sources, "Observer changed during observation");
  return { schemaVersion: 1, mode, protocol, observer: { digest: digest(sources), sources },
    run: { id: manifest.id, manifestDigest: digest(manifest), generator: manifest.generator,
      protocolDigest: manifest.protocolDigest, evaluatorDigest: manifest.evaluatorDigest, referenceDigest: manifest.referenceDigest,
      environment: manifest.environment, archives: manifest.artifacts.filter(file => file.file.startsWith("words/")) },
    configuredPairs: [...pairs].sort(), profiles, witnesses };
}
async function main(): Promise<void> {
  const [mode, directory, output] = process.argv.slice(2);
  assert.ok(mode === "original" || mode === "control" || mode === "candidate", "First argument must be original, control, or candidate");
  assert.ok(directory && output, "Usage: analyze.ts MODE RUN OUTPUT.json");
  const expectedProtocol = JSON.parse(await readFile(join(root, "evaluation/quality/protocol.json"), "utf8"));
  assert.equal((await readRun(resolve(directory))).manifest.protocolDigest, digest(expectedProtocol), "CLI requires the frozen development schedule");
  const report = await analyzeRun(resolve(directory), mode);
  await mkdir(dirname(resolve(output)), { recursive: true });
  await writeFile(resolve(output), JSON.stringify(report) + "\n", { flag: "wx" });
  console.log(`Verified and observed ${report.profiles.reduce((sum, profile) => sum + profile.totals.words, 0)} selected draws: ${output}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
