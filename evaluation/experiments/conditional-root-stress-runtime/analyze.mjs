import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { archiveSources, producer, trustedInputs } from "./capture.mjs";
import { readRawDraws, verifyRawCapture } from "./capture-core.mjs";
import { domainObservation, validateActive, validateControl } from "./observe.mjs";
import { MechanismRegistry, patternKey } from "./mechanism.mjs";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const json = value => `${JSON.stringify(value)}\n`;
const increment = (counts, key, amount = 1) => { assert(Number.isSafeInteger(amount) && amount >= 0); counts[key] = (counts[key] ?? 0) + amount; assert(Number.isSafeInteger(counts[key])); };
async function destination(path) {
  try { return await realpath(path); }
  catch (error) { if (error.code !== "ENOENT") throw error; const parent = dirname(path); assert.notEqual(parent, path); return join(await destination(parent), basename(path)); }
}
export async function protectOutput(out, inputs) {
  const target = await destination(resolve(out));
  for (const input of inputs) { const path = relative(await realpath(input), target); assert(path === ".." || path.startsWith("../"), "Analysis output overlaps an input tree"); }
  try { await lstat(out); } catch (error) { if (error.code === "ENOENT") return; throw error; }
  throw new Error("Output already exists");
}
export function observationCounts(word, active) {
  const counts = { words: 1 }; const trace = word.trace.stressPattern;
  increment(counts, "rootSyllables", trace.rootSyllableCount);
  for (const [domain, observed] of Object.entries(domainObservation(word))) {
    increment(counts, `${domain}:${observed.availability}Words`);
    if (observed.availability === "unavailable") continue;
    increment(counts, `${domain}:syllables`, observed.syllables);
    increment(counts, `${domain}:primaryMarks`, observed.primaryIndices.length);
    increment(counts, `${domain}:secondaryMarks`, observed.secondaryIndices.length);
    increment(counts, `${domain}:adjacentPairs`, observed.adjacencies.length);
    const marks = trace.snapshots.find(snapshot => snapshot.domain === domain).syllables.map(syllable => syllable.mark);
    increment(counts, `${domain}:pattern:${patternKey(marks)}`);
    for (const run of observed.unmarkedRuns) increment(counts, `${domain}:unmarkedRun:${run.position}:${run.length}`);
  }
  const weight = active ? trace.weightInput : word.trace.stressWeight;
  for (const syllable of weight.syllables) {
    increment(counts, `operationalWeight:${syllable.operational.weight}:${syllable.operational.basis}`);
    for (const phone of syllable.nucleus) increment(counts, `nuclearQuantity:${phone.quantity.status === "known" ? `known:${phone.quantity.moras}` : `unknown:${phone.quantity.reason}`}`);
  }
  increment(counts, "appliedAssignmentEvents", trace.events.length);
  for (const event of trace.events) increment(counts, `appliedCause:${event.cause.kind === "morphology" ? `${trace.morphology[event.cause.effectId].role}:${event.cause.action}` : event.cause.kind}`);
  return counts;
}
export function morphologyStratum(word) {
  const realization = word.trace.morphology?.realization;
  const role = realization?.prefix ? realization.suffix ? "both" : "prefix" : realization?.suffix ? "suffix" : "bare";
  return `${role}/root:${word.trace.stressPattern.rootSyllableCount}/word:${word.syllables.length}`;
}
export function addGroup(group, counts, mechanism) {
  for (const [key, value] of Object.entries(counts)) increment(group.counts, key, value);
  if (mechanism) {
    increment(group.contextUses, mechanism.id);
    increment(group.counts, "proposalSecondaryCount", mechanism.secondaryCount);
    increment(group.counts, "sampledSecondaryCount", mechanism.secondaryCount);
    increment(group.counts, "proposalAdjacentPairs", mechanism.proposalAdjacencies);
    increment(group.counts, "sampledAdjacentPairs", mechanism.appliedAdjacencies);
    increment(group.counts, "proposalChangedWords", Number(mechanism.proposalPattern !== mechanism.appliedPattern));
    increment(group.counts, "supportVariableWords", Number(mechanism.supportCostVaries));
    increment(group.counts, `proposalPattern:${mechanism.proposalPattern}`);
    increment(group.counts, `sampledPattern:${mechanism.appliedPattern}`);
    increment(group.counts, `proposalK:${mechanism.secondaryCount}`);
  }
}
const emptyGroup = () => ({ counts: {}, contextUses: {} });
export async function analyzeArchive(options) {
  const { root, original, freeze, expectedFreeze, variant, input, expectedManifest, out } = options;
  assert(["control", "active"].includes(variant)); await protectOutput(out, [root, original, input]);
  const frozen = await trustedInputs(options);
  const manifestBytes = await readFile(join(input, "manifest.json")); assert.equal(sha(manifestBytes), expectedManifest, "Unreviewed raw archive manifest");
  const expected = { input, expectedProducer: producer(frozen, expectedFreeze, variant), expectedConfig: frozen.configs[variant], expectedSources: await archiveSources(frozen, root, original, variant) };
  const raw = await verifyRawCapture(expected);
  const groups = { total: emptyGroup(), profiles: {}, streams: {}, strata: {} }; const registry = new MechanismRegistry();
  let words = 0; let at = null;
  try {
    for (const profile of frozen.schedule.profiles) for (const seed of profile.seeds.development) {
      let drawIndex = 0;
      for await (const draw of readRawDraws(join(input, `words/${profile.id}-${seed}.jsonl.gz`))) {
        at = { profile: profile.id, seed, drawIndex }; assert.equal(draw.profile, profile.id); assert.equal(draw.seed, seed); assert.equal(draw.drawIndex, drawIndex++);
        assert(drawIndex <= frozen.schedule.wordsPerReplicate);
        let mechanism;
        if (variant === "active") {
          const validated = validateActive(draw.word, frozen.configs.active);
          mechanism = { ...registry.observe(validated.input, validated.secondaryCount, validated.proposalMarks, validated.appliedMarks), secondaryCount: validated.secondaryCount };
        } else validateControl(draw.word, frozen.configs.control);
        const counts = observationCounts(draw.word, variant === "active");
        const profileGroup = groups.profiles[profile.id] ??= emptyGroup();
        const streamGroup = groups.streams[`${profile.id}/${seed}`] ??= emptyGroup();
        const stratumGroup = groups.strata[`${profile.id}/${morphologyStratum(draw.word)}`] ??= emptyGroup();
        for (const group of [groups.total, profileGroup, streamGroup, stratumGroup]) addGroup(group, counts, mechanism);
        words++;
      }
      assert.equal(drawIndex, 10000); process.stderr.write(`${Object.keys(groups.streams).length}/20 observed streams\n`);
    }
    assert.equal(words, 200000); assert.equal(groups.total.counts.words, words); assert.equal(Object.keys(groups.streams).length, 20);
    await verifyRawCapture(expected);
    assert.deepStrictEqual(await readFile(join(input, "manifest.json")), manifestBytes);
    await trustedInputs(options);
    const result = { schemaVersion: "q09-runtime-observation-v1", passed: true, variant, sourceFreezeSha256: expectedFreeze,
      archiveManifestSha256: expectedManifest, generatorSourceDigest: raw.manifest.generator.sourceDigest,
      scope: "returned-attempt actual domains, same-engine integration replay and per-context declared-law analysis; independent history verification is separate",
      groups, contexts: registry.snapshot(), completedWords: words };
    await writeFile(out, json(result), { flag: "wx" }); return result;
  } catch (error) {
    await writeFile(out, json({ schemaVersion: "q09-runtime-observation-v1", passed: false, variant, sourceFreezeSha256: expectedFreeze,
      archiveManifestSha256: expectedManifest, completedWords: words, at, error: { name: error.name, message: error.message, stack: error.stack } }), { flag: "wx" });
    throw error;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [root, original, freeze, expectedFreeze, variant, input, expectedManifest, out] = process.argv.slice(2);
  if (process.argv.length !== 10) throw new Error("Usage: analyze.mjs ROOT ORIGINAL FREEZE FREEZE_SHA VARIANT RAW_RUN MANIFEST_SHA FRESH_REPORT");
  const result = await analyzeArchive({ root: resolve(root), original: resolve(original), freeze: resolve(freeze), expectedFreeze, variant, input: resolve(input), expectedManifest, out: resolve(out) });
  process.stdout.write(json({ passed: result.passed, words: result.completedWords, contexts: result.contexts.length }));
}
