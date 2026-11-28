import { createHash } from "node:crypto";
import { mkdir, open, readFile, rmdir, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { git } from "../quality/git.js";
import { validateProtocol } from "../quality/capture.js";
import type { Protocol } from "../quality/model.js";
import { sha256 } from "../review/wordlikeness/model.js";
import { LEGACY_ENGLISH_IDENTITIES } from "../../src/phonology/identity.js";
import { CONSONANTS, VOWELS } from "./cmu.js";
import { jsonDigest } from "./identity.js";
import { compareGenerated } from "./syllabified-generated.js";
import { loadAuditedPopulation, X5_POPULATION } from "./syllabified-population.js";
import { CMU_ROOT_SYLLABIFICATION_V1, CONFIG_MEDIAL_CHECK } from "./syllabified-reference.js";
import { buildSyllabifiedReference } from "./syllabified-reference-builder.js";
import { cmuLegacyEnglishAdapter, mapReferenceTokens } from "./variety-adapter.js";
import { loadPinnedRootPairCensus } from "./uci-root-counts.js";

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
const census = await loadPinnedRootPairCensus();

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

async function buildReferenceFile() {
  const rowFingerprint = createHash("sha256");
  const rowsName = "mapped-roots.jsonl";
  const rows = await open(join(outputDirectory, rowsName), "wx");
  ownedFiles.push(rowsName);
  try {
    const result = await buildSyllabifiedReference({ population, census, frozen, adapter: cmuLegacyEnglishAdapter }, async line => {
      await rows.writeFile(line);
      rowFingerprint.update(line);
    });
    files[rowsName] = rowFingerprint.digest("hex");
    return result;
  } finally {
    await rows.close();
  }
}

async function writeOutput() {
  const { inventories, ...tables } = await buildReferenceFile();
  const legacyCoverage = LEGACY_ENGLISH_IDENTITIES.map(({ sound, kind }) => {
    const phone = { sound };
    const syllable = kind === "vowel" ? { onset: [], nucleus: [phone], coda: [], stress: "ˈ" }
      : { onset: [phone], nucleus: [], coda: [] };
    return cmuLegacyEnglishAdapter.mapGenerated({ syllables: [syllable] })[0];
  });
  const inventoryCoverage = {
    cmu: mapReferenceTokens([...CONSONANTS, ...[...VOWELS].flatMap(base => [0, 1, 2].map(stress => base + stress))], cmuLegacyEnglishAdapter),
    legacy: legacyCoverage,
    legacyUnmarkedNuclei: LEGACY_ENGLISH_IDENTITIES.filter(identity => identity.kind === "vowel").map(({ sound }) =>
      cmuLegacyEnglishAdapter.mapGenerated({ syllables: [{ onset: [], nucleus: [{ sound }], coda: [] }] })[0]),
  };
  const report = { descriptor: cmuLegacyEnglishAdapter.descriptor, syllabification: CMU_ROOT_SYLLABIFICATION_V1,
    configuredBoundaryCheck: CONFIG_MEDIAL_CHECK, population: X5_POPULATION, inventoryCoverage, ...tables,
  };
  await writeJson("reference.json", report);
  for (const seed of words > 0 ? seeds : []) {
    const result = compareGenerated(seed, words, inventories, profile === "lexicon-default");
    await writeJson(`generated-${seed}.json`, { profile, cohort: developmentSeeds.indexOf(seed) < 3 ? "trial" : "confirmation", ...result });
  }

  if (!isDeepStrictEqual(generator, await generatorIdentity())) throw new Error("Generator source changed during measurement.");
  await writeJson("manifest.json", {
    version: "x5-reference-run-v2",
    generator,
    protocol: { id: protocol.id, sha256: sha256(protocolText), profile, cohort, seeds: words > 0 ? seeds : [], wordsPerSeed: words },
    descriptor: cmuLegacyEnglishAdapter.descriptor.version,
    syllabification: CMU_ROOT_SYLLABIFICATION_V1,
    files: { ...files },
  });
}
