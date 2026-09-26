import { readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { resolve } from "node:path";
import { CMU_SHA256, sha256 } from "../review/wordlikeness/model.js";
import { parseCmuRecords } from "./cmu.js";
import { jsonDigest } from "./identity.js";
import { addCount, addSpelling, buildJointReference, histogram, validateJointReference, type Histogram, type JointReference } from "./joint.js";

export const JOINT_SOURCE_PATHS = [
  "evaluation/corpus/cmu.ts", "evaluation/corpus/identity.ts", "evaluation/corpus/joint.ts",
  "evaluation/corpus/joint-artifact.ts", "evaluation/corpus/joint-cli.ts", "evaluation/review/wordlikeness/model.ts",
] as const;
export interface SourceFile { path: string; content: string }
export interface PhoneProjection {
  id: "cmu-base-to-legacy-ipa-v1";
  mapping: Record<string, string>;
  losses: "stress-already-removed; legacy-IPA-labels-do-not-establish-phonemic-or-dialect-equivalence";
  inputEvents: number;
  mapped: Histogram;
  unmapped: Histogram;
}
export function projectPhones(base: Histogram, mapping: Record<string, string>): PhoneProjection {
  const mapped = histogram(), unmapped = histogram();
  for (const [phone, count] of Object.entries(base.counts)) addCount(mapping[phone] ? mapped : unmapped, mapping[phone] ?? phone, count);
  return { id: "cmu-base-to-legacy-ipa-v1", mapping: { ...mapping },
    losses: "stress-already-removed; legacy-IPA-labels-do-not-establish-phonemic-or-dialect-equivalence",
    inputEvents: base.total, mapped, unmapped };
}
interface LegacyLength {
  total: number; byLen: Record<string, number>; bySyl: Record<string, number>;
  bySylLen: Record<string, { count: number; byLen: Record<string, number>; stats: unknown }>;
  overallStats: unknown;
}
const LEGACY_PATHS = ["cmu-lexicon-letters.json", "cmu-lexicon-bigrams.json", "cmu-lexicon-trigrams.json", "cmu-length-baseline.json", "cmu-lexicon-phonemes.json", "phoneme-normalization.json"].map(file => `data/cmu/${file}`);
const LEGACY_HASHES: Record<string, string> = {
  "data/cmu/cmu-length-baseline.json": "f7bd916da8bb33102c28e70cc5a2e34bf58d17c165204d607bc73f60e8754a2e",
  "data/cmu/cmu-lexicon-bigrams.json": "c4696557ddb50390298030e8295fb0dba70b03e85c15c525ffab311a8d8f3167",
  "data/cmu/cmu-lexicon-letters.json": "70a5c793cebab577585a5e4414389b38342bf3f07c146d625870f4286469240c",
  "data/cmu/cmu-lexicon-phonemes.json": "3d7cb879c6ff7edc7599c8d0b57cba72df6ee1d86bf20f723d88b83ff6863aa9",
  "data/cmu/cmu-lexicon-trigrams.json": "acb458d762a95753bed516202812e79201ee6604adb4d94aab2ac256b5553d7b",
  "data/cmu/phoneme-normalization.json": "60ffe6783768e66abeaaca798f8da0c1c0d291505bd5798c0641f938e0d495ba",
};
const LICENSE_PATH = "evaluation/review/wordlikeness/artifacts/CMUDICT-LICENSE.txt";
const LICENSE_HASH = "bd4ce8e44170a5f9f481310ca85c51de3c4f851a65e679b40e603b143bd3542a";
export interface JointArtifact {
  version: "cmu-joint-reference-artifact-v1";
  reference: JointReference;
  comparisonProjection: PhoneProjection;
  legacy: {
    artifacts: SourceFile[];
    characters: { id: string; accepted: number; units: "integer-character-occurrences"; reconstruction: string; counts: JointReference["characters"] };
    lengths: { id: string; accepted: number; units: "integer-pronunciation-line-counts"; reconstruction: string };
    phones: { id: string; units: "rounded-percentage"; denominator: null; sourcePopulation: "unresolved"; displayedSum: number };
  };
  implementation: { digest: string; sources: SourceFile[] };
  license: SourceFile & { sha256: string };
}
export interface JointEnvelope { digest: string; artifact: JointArtifact }

function equal(actual: unknown, expected: unknown, label: string): void {
  if (!isDeepStrictEqual(actual, expected)) throw new Error(`Legacy reconstruction failed: ${label}`);
}
function fields(value: object, expected: string[], label: string): void {
  equal(Object.keys(value).sort(), expected.sort(), `${label} fields`);
}
function stats(counts: Record<string, number>): object {
  const lengths = Object.entries(counts).flatMap(([length, count]) => Array<number>(count).fill(Number(length))).sort((a, b) => a - b);
  const at = (fraction: number) => lengths[Math.floor(lengths.length * fraction)];
  return { mean: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length * 100) / 100, median: at(0.5), p10: at(0.1), p90: at(0.9) };
}

/** Named reconstructions describe existing artifacts; they do not change joint selection. */
function reconstructLegacy(text: string, artifacts: SourceFile[]): JointArtifact["legacy"] {
  const read = <T>(name: string): T => JSON.parse(artifacts.find(file => file.path === `data/cmu/${name}.json`)!.content) as T;
  const spellings = new Set<string>();
  for (const record of parseCmuRecords(text)) if (record.kind === "entry" && record.variant === null && record.spelling) spellings.add(record.spelling);
  const characters = { letters: histogram(), bigrams: histogram(), trigrams: histogram() };
  for (const spelling of spellings) addSpelling(characters, spelling);
  for (const name of ["letters", "bigrams", "trigrams"] as const) equal(characters[name].counts, read(`cmu-lexicon-${name}`), name);
  const written = histogram(), syllables = histogram(), bySyllables: Record<string, Histogram> = {};
  // This adapter intentionally reproduces the historic length builder's policy,
  // including punctuation, alternatives, and its whole-line digit counting.
  for (const line of text.split("\n")) {
    if (!line || line.startsWith(";;;")) continue;
    const space = line.indexOf(" ");
    if (space < 0) continue;
    const label = line.slice(0, space).replace(/\(\d+\)$/, "");
    const pronunciation = line.slice(space + 1).trim();
    const count = (pronunciation.match(/\d/g) ?? []).length;
    if (!label || !pronunciation || !count) continue;
    addCount(written, String(label.length)); addCount(syllables, String(count));
    addCount(bySyllables[String(count)] ??= histogram(), String(label.length));
  }
  const lengths = read<LegacyLength>("cmu-length-baseline");
  equal(written.total, lengths.total, "length entries");
  equal(written.counts, lengths.byLen, "written lengths"); equal(syllables.counts, lengths.bySyl, "syllable counts");
  equal(Object.fromEntries(Object.entries(bySyllables).map(([key, table]) => [key, { count: table.total, byLen: table.counts, stats: stats(table.counts) }])), lengths.bySylLen, "conditional written lengths");
  equal(stats(written.counts), lengths.overallStats, "length summary");
  equal(spellings.size, 117493, "legacy spelling population");
  equal(written.total, 135158, "legacy pronunciation population");
  return legacyDescription(artifacts, characters);
}

function legacyDescription(artifacts: SourceFile[], characters: JointReference["characters"]): JointArtifact["legacy"] {
  const phonePercentages = JSON.parse(artifacts.find(file => file.path.endsWith("/cmu-lexicon-phonemes.json"))!.content) as Record<string, number>;
  if (Object.values(phonePercentages).some(value => !Number.isFinite(value) || value < 0)) throw new Error("Invalid legacy phone proportions.");
  return {
    artifacts,
    characters: { id: "legacy-ascii-spelling-types-including-vowelless-v1", accepted: 117493,
      units: "integer-character-occurrences", reconstruction: "all-bins-exact-from-pinned-source; historical-build-provenance-unverified", counts: characters },
    lengths: { id: "legacy-all-pronunciation-lines-digit-count-v1", accepted: 135158,
      units: "integer-pronunciation-line-counts", reconstruction: "all-bins-and-summary-stats-exact-from-pinned-source; historical-build-provenance-unverified" },
    phones: { id: "legacy-phone-rounded-percentages-unresolved-population-v1", units: "rounded-percentage", denominator: null,
      sourcePopulation: "unresolved", displayedSum: Object.values(phonePercentages).reduce((a, b) => a + b, 0) },
  };
}

const readSources = async (root: string, paths: readonly string[]): Promise<SourceFile[]> => Promise.all(paths.map(async path => ({ path, content: await readFile(resolve(root, path), "utf8") })));

export async function writeJointArtifact(root: string, source: string, out: string): Promise<JointEnvelope> {
  const bytes = await readFile(source);
  if (sha256(bytes.toString("utf8")) !== CMU_SHA256 || !bytes.equals(Buffer.from(bytes.toString("utf8")))) throw new Error("Raw source bytes differ from pinned UTF-8 dictionary.");
  const implementation = await readSources(root, JOINT_SOURCE_PATHS);
  const legacy = await readSources(root, LEGACY_PATHS);
  const [license] = await readSources(root, [LICENSE_PATH]);
  const reference = buildJointReference(bytes.toString("utf8"));
  const normalization = JSON.parse(legacy.find(file => file.path.endsWith("/phoneme-normalization.json"))!.content) as { arpabetToIpa: Record<string, string> };
  const artifact: JointArtifact = {
    version: "cmu-joint-reference-artifact-v1", reference,
    comparisonProjection: projectPhones(reference.phones.base, normalization.arpabetToIpa),
    legacy: reconstructLegacy(bytes.toString("utf8"), legacy),
    implementation: { digest: jsonDigest(implementation), sources: implementation },
    license: { ...license, sha256: sha256(license.content) },
  };
  const envelope = { digest: jsonDigest(artifact), artifact };
  validateJointEnvelope(envelope, implementation);
  equal(await readSources(root, JOINT_SOURCE_PATHS), implementation, "implementation changed during build");
  equal(await readSources(root, LEGACY_PATHS), legacy, "legacy artifacts changed during build");
  equal(await readSources(root, [license.path]), [license], "license changed during build");
  await writeFile(out, JSON.stringify(envelope) + "\n", { flag: "wx" });
  return envelope;
}

/** Source self-consistency is distinct from authenticity; consumers pin expectedSources. */
export function validateJointEnvelope(envelope: JointEnvelope, expectedSources?: SourceFile[]): void {
  const { artifact } = envelope;
  fields(envelope, ["digest", "artifact"], "envelope");
  fields(artifact, ["version", "reference", "comparisonProjection", "legacy", "implementation", "license"], "artifact");
  equal(jsonDigest(artifact), envelope.digest, "artifact digest");
  equal(artifact.version, "cmu-joint-reference-artifact-v1", "artifact version");
  validateJointReference(artifact.reference);
  equal(artifact.implementation.sources.map(source => source.path), [...JOINT_SOURCE_PATHS], "implementation paths");
  fields(artifact.implementation, ["digest", "sources"], "implementation");
  for (const source of [...artifact.implementation.sources, ...artifact.legacy.artifacts]) fields(source, ["path", "content"], "source");
  equal(jsonDigest(artifact.implementation.sources), artifact.implementation.digest, "implementation digest");
  if (expectedSources) equal(artifact.implementation.sources, expectedSources, "expected implementation sources");
  equal(artifact.legacy.artifacts.map(source => source.path), LEGACY_PATHS, "legacy paths");
  for (const source of artifact.legacy.artifacts) equal(sha256(source.content), LEGACY_HASHES[source.path], `pinned ${source.path}`);
  fields(artifact.license, ["path", "content", "sha256"], "license");
  equal(artifact.license.path, LICENSE_PATH, "license path");
  equal(artifact.license.sha256, LICENSE_HASH, "pinned license");
  equal(sha256(artifact.license.content), artifact.license.sha256, "license digest");
  const normalization = JSON.parse(artifact.legacy.artifacts.find(source => source.path.endsWith("/phoneme-normalization.json"))!.content);
  equal(artifact.comparisonProjection, projectPhones(artifact.reference.phones.base, normalization.arpabetToIpa), "comparison projection");
  equal(artifact.comparisonProjection.unmapped.total, 0, "complete CMU comparison mapping");
  const characters = { letters: histogram(), bigrams: histogram(), trigrams: histogram() };
  for (const name of ["letters", "bigrams", "trigrams"] as const) {
    const counts = JSON.parse(artifact.legacy.artifacts.find(source => source.path === `data/cmu/cmu-lexicon-${name}.json`)!.content) as Record<string, number>;
    for (const [key, count] of Object.entries(counts)) addCount(characters[name], key, count);
  }
  equal(artifact.legacy, legacyDescription(artifact.legacy.artifacts, characters), "legacy statistics and policies");
}
