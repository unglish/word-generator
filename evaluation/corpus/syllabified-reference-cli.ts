import { createHash } from "node:crypto";
import { mkdir, open, readFile, rmdir, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { englishConfig } from "../../src/config/english.js";
import { git } from "../quality/git.js";
import { validateProtocol } from "../quality/capture.js";
import type { Protocol } from "../quality/model.js";
import { sha256, type ReferenceModel } from "../review/wordlikeness/model.js";
import { LEGACY_ENGLISH_IDENTITIES } from "../../src/phonology/identity.js";
import { CONSONANTS, VOWELS } from "./cmu.js";
import { jsonDigest } from "./identity.js";
import { addCount, histogram } from "./joint.js";
import { compareGenerated } from "./syllabified-generated.js";
import { loadAuditedPopulation, X5_POPULATION } from "./syllabified-population.js";
import { CMU_ROOT_SYLLABIFICATION_V1, configClusterLicense, inferSyllables, onsetInventories, POLICIES } from "./syllabified-reference.js";
import { compatibilityConstituents, countConstituents, createConstituentTables } from "./syllabified-tables.js";
import { cmuLegacyEnglishAdapter } from "./variety-adapter.js";

const { values: { source, "phase-one": phaseOne, out, "words-per-seed": limit, profile, cohort } } = parseArgs({
  options: {
    source: { type: "string" }, "phase-one": { type: "string" }, out: { type: "string" },
    "words-per-seed": { type: "string" }, profile: { type: "string", default: "lexicon-bare" },
    cohort: { type: "string", default: "all" },
  },
});
if (!source || !phaseOne || !out || !["lexicon-bare", "lexicon-default"].includes(profile) ||
  !["trial", "confirmation", "all"].includes(cohort)) {
  throw new Error("Use --source PINNED_CMU --phase-one PINNED_PHASE_ONE.json --out NEW_DIRECTORY [--words-per-seed N] [--profile lexicon-bare|lexicon-default] [--cohort trial|confirmation|all]");
}
const outputDirectory = resolve(out);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const frozen = JSON.parse(await readFile(join(root, "evaluation/review/wordlikeness/artifacts/reference-v1.json"), "utf8"));
const frozenDigest = "98d71552d9419d465977520c1101480a1f1ebfa968fb7e3b89eefea30e031878";
if (frozen.digest !== frozenDigest || jsonDigest(frozen.model) !== frozenDigest) {
  throw new Error("Unexpected frozen #304 model.");
}
const protocolText = await readFile(join(root, "evaluation/quality/protocol.json"), "utf8");
const protocol: Protocol = JSON.parse(protocolText);
validateProtocol(protocol);
const settings = protocol.profiles.find(({ id }) => id === profile);
if (!settings || settings.seeds.development.length !== 5 || settings.options.mode !== "lexicon" ||
  settings.options.syllableCount !== undefined || settings.options.morphology !== (profile === "lexicon-default")) {
  throw new Error("The selected profile must specify five development seeds and the expected lexicon options.");
}
const developmentSeeds = settings.seeds.development;
const seeds = cohort === "trial" ? developmentSeeds.slice(0, 3) : cohort === "confirmation" ? developmentSeeds.slice(3) : developmentSeeds;
const words = Number(limit ?? protocol.wordsPerReplicate);
if (!Number.isSafeInteger(words) || words < 0) throw new Error("--words-per-seed must be a nonnegative integer (0 skips generation).");

const population = await loadAuditedPopulation({ source, phaseOne,
  audit: join(root, "evaluation/corpus/root-coda-exclusions.json"), projection: join(root, "data/cmu/phoneme-normalization.json") });
const roots = population.roots.map(({ source, surfaces }) => ({ source, surfaces, phones: cmuLegacyEnglishAdapter.mapReference(source.tokens) }));
const inventories = onsetInventories(frozen.model.initial_onsets, roots.map(row => row.phones), configClusterLicense(englishConfig));
const policies = POLICIES.map(policy => ({ policy, distinct: createConstituentTables(), surfaceWeighted: createConstituentTables(),
  changesFrom304: histogram(), boundaryChangesFrom304: histogram() }));

const compatibility: ReferenceModel["constituents"] = {};
for (const { tokens } of population.entries) {
  const phones = cmuLegacyEnglishAdapter.mapReference(tokens);
  compatibilityConstituents(compatibility, phones, inferSyllables(phones, "304", inventories), 1);
}
if (!isDeepStrictEqual(compatibility, frozen.model.constituents)) throw new Error("Recount differs from frozen #304 constituents.");

async function generatorIdentity() {
  const revision = git(root, "rev-parse", "HEAD");
  const paths = git(root, "ls-files", "--cached", "--others", "--exclude-standard", "--", "src").split("\n")
    .filter(path => path && !/\.(test|bench)\./.test(path)).sort();
  const files = await Promise.all(paths.map(async path => [path, sha256(await readFile(join(root, path), "utf8"))]));
  return { revision, sourceDigest: jsonDigest(files) };
}

const generator = await generatorIdentity();
const files: Record<string, string> = {};
const ownedFiles: string[] = [];
async function writeJson(name: string, value: unknown) {
  const content = JSON.stringify(value) + "\n";
  const file = await open(join(outputDirectory, name), "wx");
  ownedFiles.push(name);
  try {
    await file.writeFile(content);
  } finally {
    await file.close();
  }
  files[name] = sha256(content);
}

await mkdir(outputDirectory);
try {
  await writeOutput();
} catch (error) {
  await Promise.allSettled(ownedFiles.map(name => unlink(join(outputDirectory, name))));
  await rmdir(outputDirectory).catch(() => {});
  throw error;
}

async function writeOutput() {
  const rowFingerprint = createHash("sha256");
  const rowsName = "mapped-roots.jsonl";
  const rows = await open(join(outputDirectory, rowsName), "wx");
  ownedFiles.push(rowsName);
  try {
    for (const { source: { line, label, spelling }, surfaces, phones } of roots) {
      const splits = Object.fromEntries(POLICIES.map(policy => [policy, inferSyllables(phones, policy, inventories)]));
      for (const { policy, distinct, surfaceWeighted, changesFrom304, boundaryChangesFrom304 } of policies) {
        const analysis = splits[policy];
        const weight = surfaces.length;
        countConstituents(distinct, phones, analysis, 1);
        countConstituents(surfaceWeighted, phones, analysis, weight);
        const baseline = splits["304"];
        if (baseline.status !== "inferred") throw new Error("Unexpected reference boundary status.");
        const differences = analysis.boundaries.filter((boundary, index) => boundary.chosenCodaSize !== baseline.boundaries[index].chosenCodaSize);
        addCount(changesFrom304, analysis.status === "unavailable" ? "unavailable" : differences.length ? "different" : "equal", weight);
        for (const boundary of differences) {
          const cluster = boundary.cluster.map(i => phones[i].raw).join(" ");
          const key = `${boundary.cluster.length}|${phones[boundary.leftNucleus].stress}>${phones[boundary.rightNucleus].stress}|${cluster}`;
          addCount(boundaryChangesFrom304, key, weight);
        }
      }
      const row = JSON.stringify({ source: { line, label, spelling }, surfaces, phones,
        adapter: cmuLegacyEnglishAdapter.descriptor.version, policy: CMU_ROOT_SYLLABIFICATION_V1.policy, splits }) + "\n";
      await rows.writeFile(row);
      rowFingerprint.update(row);
    }
  } finally {
    await rows.close();
  }
  files[rowsName] = rowFingerprint.digest("hex");

  const expectedTotals = {
    distinct: { rows: 20_851, phones: 137_008, pairs: 116_157 },
    surfaceWeighted: { rows: 42_670, phones: 255_100, pairs: 212_430 },
  };
  for (const { policy, distinct, surfaceWeighted } of policies) {
    for (const [tables, expected] of [[distinct, expectedTotals.distinct], [surfaceWeighted, expectedTotals.surfaceWeighted]] as const) {
      if (tables.rows.total !== expected.rows || tables.nativePhones.total !== expected.phones ||
        tables.nativeAdjacentPairs.total !== expected.pairs || tables.nativeBoundedPairs.total !== expected.phones + expected.rows) {
        throw new Error(`Native phones and adjacent pair totals disagree for ${policy}.`);
      }
      if ((tables.rows.counts.unavailable ?? 0) === 0 && (!isDeepStrictEqual(tables.reconstructedNativePhones, tables.nativePhones) ||
        !isDeepStrictEqual(tables.reconstructedNativeBoundedPairs, tables.nativeBoundedPairs))) {
        throw new Error(`Syllable reconstruction lost source tokens or adjacency for ${policy}.`);
      }
      const sumCounts = (group: Record<string, { total: number }>) =>
        Object.values(group).reduce((sum, cell) => sum + cell.total, 0);
      const onsetCount = sumCounts(tables.onset.permitted) + sumCounts(tables.onset.withheld);
      const rimeCount = sumCounts(tables.rime.permitted) + sumCounts(tables.rime.withheld);
      if (onsetCount !== rimeCount || onsetCount * 2 !== sumCounts(tables.compatibility)) {
        throw new Error(`Syllable constituent totals disagree for ${policy}.`);
      }
    }
  }
  const legacyCoverage = LEGACY_ENGLISH_IDENTITIES.map(({ sound, kind }) => {
    const phone = { sound };
    const syllable = kind === "vowel" ? { onset: [], nucleus: [phone], coda: [], stress: "ˈ" }
      : { onset: [phone], nucleus: [], coda: [] };
    return cmuLegacyEnglishAdapter.mapGenerated({ syllables: [syllable] })[0];
  });
  const inventoryCoverage = {
    cmu: cmuLegacyEnglishAdapter.mapReference([...CONSONANTS, ...[...VOWELS].flatMap(base => [0, 1, 2].map(stress => base + stress))]),
    legacy: legacyCoverage,
  };
  const onsets = { frozen: [...inventories.frozen].sort(), audited: [...inventories.audited].sort(),
    minimumThree: [...inventories.minimumThree].sort() };
  const report = { descriptor: cmuLegacyEnglishAdapter.descriptor, syllabification: CMU_ROOT_SYLLABIFICATION_V1,
    population: X5_POPULATION, inventoryCoverage, onsets, parity304: { digest: frozenDigest, entries: population.entries.length,
      constituentCells: Object.values(compatibility).reduce((sum, context) => sum + Object.keys(context.counts).length, 0),
      countsDigest: jsonDigest(compatibility) },
    expectedTotals, policies,
  };
  await writeJson("reference.json", report);
  for (const seed of words > 0 ? seeds : []) {
    const result = compareGenerated(seed, words, inventories, profile === "lexicon-default");
    await writeJson(`generated-${seed}.json`, { profile, cohort: developmentSeeds.indexOf(seed) < 3 ? "trial" : "confirmation", ...result });
  }

  if (!isDeepStrictEqual(generator, await generatorIdentity())) throw new Error("Generator source changed during measurement.");
  await writeJson("manifest.json", {
    version: "x5-reference-run-v1",
    generator,
    protocol: { id: protocol.id, sha256: sha256(protocolText), profile, cohort, seeds: words > 0 ? seeds : [], wordsPerSeed: words },
    descriptor: cmuLegacyEnglishAdapter.descriptor.version,
    syllabification: CMU_ROOT_SYLLABIFICATION_V1,
    files: { ...files },
  });
}
