import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export const digest = value => sha(JSON.stringify(canonical(value)));
const same = (left, right) => digest(left) === digest(right);
const add = (counts, key, n = 1) => { counts[key] = (counts[key] ?? 0) + n; };
export const empty = () => ({ counts: {}, selections: {}, boundaries: {}, cleanupChanges: {} });
const form = (source, written = source.written) => ({ written, phonemes: source.phonemes, syllableCount: source.syllableCount, syllables: source.syllables ?? null });

export function supportsDefaultIm(config) {
  const prefixes = config.morphology?.prefixes.filter(affix => affix.written === "in") ?? [];
  if (prefixes.length !== 1 || prefixes[0].allomorphs?.length !== 1) return false;
  const affix = prefixes[0];
  const variant = affix.allomorphs[0];
  return same(form(affix), { written: "in", phonemes: ["ɪ", "n"], syllableCount: 1, syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["n"] }] })
    && same(form(variant), { written: "im", phonemes: ["ɪ", "m"], syllableCount: 1, syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["m"] }] })
    && same(variant.phonologicalCondition, { position: "following", place: ["bilabial"] });
}

function actualMorphology(word) {
  const morph = word.trace.morphology;
  return morph?.prefix ? morph.suffix ? "both" : "prefix" : morph?.suffix ? "suffix" : "none";
}

export function observe(group, word, config) {
  assert.ok(word.trace, "Every word requires archived trace evidence");
  const counts = group.counts;
  const evidence = [];
  add(counts, "words");
  const morph = word.trace.morphology;
  if (!morph?.prefix && !morph?.suffix) return evidence;
  add(counts, "affixedWords");
  const realization = morph.realization;
  if (!realization) add(counts, "unknownResolutionWords");
  else {
    add(counts, "explicitResolutionWords");
    add(counts, "emittedOutputMismatchWords", Number(realization.emittedParts.map(part => part.text).join("") !== word.written.clean));
    add(counts, "partRoleMismatchWords", Number(!same(realization.assembledParts.map(part => part.role), realization.emittedParts.map(part => part.role))));
    for (const role of ["prefix", "suffix"]) {
      if (!morph[role]) continue;
      add(counts, "affixSelections");
      const selected = realization[role];
      if (!selected) { add(counts, "missingAffixSelection"); continue; }
      const key = `${role}/${morph[role]}/${selected.allomorphIndex ?? "base"}/${selected.resolved.written}`;
      add(group.selections, key);
      add(group.boundaries, `${key}/${selected.boundaryPhoneme?.sound ?? "unknown"}`);
      evidence.push(`selection/${key}`);
      add(counts, "plannedLabelMismatch", Number(selected.planned.written !== morph[role]));
      const affixes = config.morphology[role === "prefix" ? "prefixes" : "suffixes"].filter(affix => affix.written === morph[role]);
      if (affixes.length !== 1) add(counts, "unknownConfigSelection");
      else {
        const affix = affixes[0];
        const variant = selected.allomorphIndex === null ? affix : affix.allomorphs?.[selected.allomorphIndex];
        add(counts, "configSelectionsChecked");
        add(counts, "configSelectionMismatch", Number(!variant || !same(form(selected.planned), form(affix))
          || !same(form(selected.resolved), form(variant, variant.written ?? affix.written))));
      }
      const assembled = realization.assembledParts.filter(part => part.role === role);
      const mismatch = assembled.length !== 1 || assembled[0].text !== selected.resolved.written;
      add(counts, "selectedAffixAssemblyMismatch", Number(mismatch));
      if (mismatch) evidence.push(`assembly-mismatch/${role}`);
    }
    let changed = false;
    for (let i = 0; i < realization.assembledParts.length; i++) {
      const before = realization.assembledParts[i];
      const after = realization.emittedParts[i];
      if (before.role !== after?.role || before.text !== after.text) {
        changed = true;
        add(group.cleanupChanges, before.role);
        evidence.push(`cleanup/${before.role}`);
      }
    }
    add(counts, "wordsWithCleanupChanges", Number(changed));
  }

  if (morph.prefix === "in") {
    add(counts, "plannedInWords");
    const rootStage = word.trace.stages.at(-1);
    const rootPhone = rootStage?.name === "generatePronunciation"
      ? rootStage.after.flatMap(syllable => [...syllable.onset, ...syllable.nucleus, ...syllable.coda])[0] : undefined;
    const phones = config.phonemes.filter(phone => phone.sound === rootPhone);
    if (!supportsDefaultIm(config) || phones.length !== 1) add(counts, "unknownDerivedInContextWords");
    else {
      add(counts, "derivedInContextWords");
      if (phones[0].placeOfArticulation === "bilabial") {
        add(counts, "sourceDerivedImEligibleWords");
        const spelling = word.written.clean.startsWith("im") ? "im" : word.written.clean.startsWith("in") ? "in" : "other";
        add(counts, `sourceDerivedImFinalSpelling:${spelling}`);
        add(counts, "sourceDerivedImCodaConfirmed", Number(same(word.syllables[0].coda.map(phone => phone.sound), ["m"])));
        evidence.push(`source-derived-im/${spelling}`);
      }
    }
  }
  return evidence;
}

async function readPinned(directory, manifest, file) {
  const entry = manifest.artifacts.find(item => item.file === file);
  assert.ok(entry, `Unpinned artifact ${file}`);
  const bytes = await readFile(join(directory, file));
  assert.equal(bytes.length, entry.bytes, `Artifact size mismatch: ${file}`);
  assert.equal(sha(bytes), entry.sha256, `Artifact checksum mismatch: ${file}`);
  return bytes;
}

export async function analyzeRun(directory) {
  const manifestBytes = await readFile(join(directory, "manifest.json"));
  const { manifest, digest: manifestDigest } = JSON.parse(manifestBytes);
  assert.equal(digest(manifest), manifestDigest, "Manifest checksum mismatch");
  assert.equal(digest(manifest.protocol), manifest.protocolDigest, "Protocol checksum mismatch");
  assert.equal(manifest.cohort, "development", "This probe does not inspect validation words");
  const summary = JSON.parse(await readPinned(directory, manifest, "summary.json"));
  const sources = JSON.parse(gunzipSync(await readPinned(directory, manifest, "sources.json.gz")));
  assert.equal(digest(sources.generator), manifest.generator.sourceDigest, "Archived generator source mismatch");
  const config = manifest.generator.effectiveConfig;
  const shards = manifest.protocol.profiles.flatMap(profile => profile.seeds.development.map(seed => ({ profile: profile.id, seed, file: `words/${profile.id}-${seed}.jsonl.gz` })));
  assert.deepEqual(manifest.artifacts.filter(item => item.file.startsWith("words/")).map(item => item.file).sort(), shards.map(item => item.file).sort(), "Unexpected manifest shard set");
  assert.deepEqual((await readdir(join(directory, "words"))).sort(), shards.map(item => item.file.slice(6)).sort(), "Unexpected word directory contents");
  const total = empty();
  const profiles = {};
  const strata = {};
  const replicates = {};
  const witnesses = {};
  for (const shard of shards) {
    const lines = gunzipSync(await readPinned(directory, manifest, shard.file)).toString("utf8").trimEnd().split("\n");
    assert.equal(lines.length, manifest.protocol.wordsPerReplicate, `Incorrect draw count: ${shard.file}`);
    const replicate = replicates[`${shard.profile}/${shard.seed}`] = empty();
    const profile = profiles[shard.profile] ??= empty();
    for (let index = 0; index < lines.length; index++) {
      const draw = JSON.parse(lines[index]);
      assert.equal(draw.profile, shard.profile);
      assert.equal(draw.seed, shard.seed);
      assert.equal(draw.drawIndex, index);
      const stratum = strata[`${draw.profile}/${actualMorphology(draw.word)}`] ??= empty();
      const evidence = observe(total, draw.word, config);
      for (const group of [profile, stratum, replicate]) observe(group, draw.word, config);
      for (const key of evidence) {
        const list = witnesses[key] ??= [];
        if (list.length < 3) list.push(draw);
      }
    }
  }
  for (const profile of summary.profiles) assert.equal(profiles[profile.id].counts.words, profile.words, "Frozen denominator mismatch");
  return {
    directory, id: manifest.id, manifestFileDigest: sha(manifestBytes), manifestDigest,
    sourceDigest: manifest.generator.sourceDigest, protocolDigest: manifest.protocolDigest,
    evaluatorDigest: manifest.evaluatorDigest, referenceDigest: manifest.referenceDigest,
    supportsSourceDerivedIm: supportsDefaultIm(config), total, profiles, strata, replicates, witnesses,
  };
}

async function main() {
  const [baselinePath, candidatePath, output] = process.argv.slice(2);
  assert.ok(baselinePath && candidatePath && output, "Usage: node analyze.mjs BASELINE CANDIDATE OUTPUT");
  const baseline = await analyzeRun(resolve(baselinePath));
  const candidate = await analyzeRun(resolve(candidatePath));
  for (const key of ["protocolDigest", "evaluatorDigest", "referenceDigest"]) assert.equal(baseline[key], candidate[key], `Incompatible ${key}`);
  const path = fileURLToPath(import.meta.url);
  const report = { probeVersion: 1, sourceDigest: sha(await readFile(path)), preregistrationDigest: sha(await readFile(join(dirname(path), "README.md"))), baseline, candidate };
  await mkdir(dirname(resolve(output)), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ output, baselineWords: baseline.total.counts.words, candidateWords: candidate.total.counts.words }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
