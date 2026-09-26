import { createHash } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { gunzipSync } from "node:zlib";
import { CMU_SHA256, sha256 } from "../review/wordlikeness/model.js";
import { jsonDigest } from "./identity.js";
import { buildJointReference, JOINT_REFERENCE_DIGEST, PHONE_PROJECTIONS, type JointReference } from "./joint.js";
import { JOINT_SOURCE_PATHS, projectPhones, validateJointEnvelope, type JointEnvelope, type PhoneProjection, type SourceFile } from "./joint-artifact.js";

export const PHONEME_POLICY = "cmu-ascii-first-v1";
export const PHONEME_UNITS = "integer-phone-occurrences";
export const PHONEME_PARENT_PATH = "evaluation/experiments/cmu-matched-reference/reference.json.gz";
export const PHONEME_PARENT_SHA256 = "d7b32d1c6f49edf8211f96db14139086172288f138328d37b41ae144b685a118";
export const PHONEME_PARENT_DIGEST = "f8f5bdd9a083772f76cbb7b9db78ddebb67bcea5fa04afbccfb20f6b0a628862";
export const PHONEME_SOURCE_PATHS = [
  ...JOINT_SOURCE_PATHS, "scripts/build-cmu-phoneme-baseline.mjs",
  "evaluation/corpus/phoneme-builder.ts", "evaluation/corpus/phoneme-cli.ts", "package-lock.json",
] as const;

export interface PhonemeReferenceArtifact {
  version: "cmu-phoneme-reference-artifact-v1";
  source: JointReference["source"];
  parser: JointReference["parser"];
  population: JointReference["population"];
  policy: typeof PHONEME_POLICY;
  parentReference: { version: "cmu-joint-reference-artifact-v1"; artifactDigest: string; referenceDigest: string; compressedFileSha256: string };
  units: typeof PHONEME_UNITS;
  phones: {
    native: JointReference["phones"]["native"] & { projection: typeof PHONE_PROJECTIONS.native };
    base: JointReference["phones"]["base"] & { projection: typeof PHONE_PROJECTIONS.base };
    comparison: PhoneProjection;
  };
  normalization: SourceFile & { sha256: string };
  license: SourceFile & { sha256: string };
  implementation: { digest: string; sources: SourceFile[]; packageLockSha256: string };
}
export interface PhonemeReferenceEnvelope { digest: string; artifact: PhonemeReferenceArtifact }
export interface PhonemeBuildOptions { source: string; out: string; policy: string; units: string }

function equal(actual: unknown, expected: unknown, label: string): void {
  if (!isDeepStrictEqual(actual, expected)) throw new Error(`Phoneme reference ${label} mismatch.`);
}
const bytesDigest = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
const readSources = (root: string, paths: readonly string[]): Promise<SourceFile[]> =>
  Promise.all(paths.map(async path => ({ path, content: await readFile(resolve(root, path), "utf8") })));

function validateParent(parent: JointEnvelope, sources: SourceFile[]): void {
  equal(parent.digest, PHONEME_PARENT_DIGEST, "published parent identity");
  validateJointEnvelope(parent, sources.filter(source => (JOINT_SOURCE_PATHS as readonly string[]).includes(source.path)));
  equal(jsonDigest(parent.artifact.reference), JOINT_REFERENCE_DIGEST, "published reference identity");
}

/** Derive the three views from a validated parent; raw-source reconstruction is performed by the writer. */
export function createPhonemeEnvelope(parent: JointEnvelope, sources: SourceFile[]): PhonemeReferenceEnvelope {
  equal(sources.map(source => source.path), [...PHONEME_SOURCE_PATHS], "implementation paths");
  for (const source of sources) {
    equal(Object.keys(source).sort(), ["content", "path"], "implementation source fields");
    if (typeof source.content !== "string") throw new Error("Implementation source content must be text.");
  }
  validateParent(parent, sources);
  const { reference } = parent.artifact;
  const normalization = parent.artifact.legacy.artifacts.find(source => source.path === "data/cmu/phoneme-normalization.json")!;
  const mapping = (JSON.parse(normalization.content) as { arpabetToIpa: Record<string, string> }).arpabetToIpa;
  const comparison = projectPhones(reference.phones.base, mapping);
  equal(comparison, parent.artifact.comparisonProjection, "parent comparison projection");
  const artifact: PhonemeReferenceArtifact = structuredClone({
    version: "cmu-phoneme-reference-artifact-v1", source: reference.source, parser: reference.parser,
    population: reference.population, policy: PHONEME_POLICY,
    parentReference: { version: "cmu-joint-reference-artifact-v1", artifactDigest: parent.digest,
      referenceDigest: JOINT_REFERENCE_DIGEST, compressedFileSha256: PHONEME_PARENT_SHA256 },
    units: PHONEME_UNITS,
    phones: {
      native: { projection: PHONE_PROJECTIONS.native, ...reference.phones.native },
      base: { projection: PHONE_PROJECTIONS.base, ...reference.phones.base }, comparison,
    },
    normalization: { ...normalization, sha256: sha256(normalization.content) }, license: parent.artifact.license,
    implementation: { digest: jsonDigest(sources), sources,
      packageLockSha256: sha256(sources.find(source => source.path === "package-lock.json")!.content) },
  });
  return { digest: jsonDigest(artifact), artifact };
}

/** Expected reviewed sources are mandatory: self-consistent embedded code is not authentication. */
export function validatePhonemeEnvelope(envelope: unknown, parent: JointEnvelope, expectedSources: SourceFile[]): asserts envelope is PhonemeReferenceEnvelope {
  equal(envelope, createPhonemeEnvelope(parent, expectedSources), "artifact, counts, schema, or expected implementation");
}

export async function readPhonemeInputs(root: string): Promise<{ parent: JointEnvelope; sources: SourceFile[]; parentBytes: Buffer }> {
  const [sources, parentBytes] = await Promise.all([
    readSources(root, PHONEME_SOURCE_PATHS), readFile(resolve(root, PHONEME_PARENT_PATH)),
  ]);
  equal(bytesDigest(parentBytes), PHONEME_PARENT_SHA256, "compressed parent bytes");
  const parent = JSON.parse(gunzipSync(parentBytes).toString("utf8")) as JointEnvelope;
  validateParent(parent, sources);
  return { parent, sources, parentBytes };
}

/** Resolve directory aliases before protecting legacy and frozen destinations. */
export async function validatePhonemeOutputPath(root: string, out: string): Promise<string> {
  const [realRoot, parent] = await Promise.all([realpath(root), realpath(dirname(resolve(out)))]);
  const path = join(parent, basename(out));
  const directoryPath = async (path: string): Promise<string> => {
    try { return await realpath(path); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return path; throw error; }
  };
  const protectedFiles = await Promise.all([
    ...PHONEME_SOURCE_PATHS, "demo/cmuBaselines.js", "demo/index.html",
    "evaluation/review/wordlikeness/artifacts/CMUDICT-LICENSE.txt",
  ].map(async file => join(await directoryPath(dirname(resolve(realRoot, file))), basename(file))));
  const protectedDirectories = await Promise.all(["data/cmu", "evaluation/experiments/cmu-matched-reference"]
    .map(directory => directoryPath(resolve(realRoot, directory))));
  if (protectedFiles.includes(path) || protectedDirectories.some(directory => path === directory || path.startsWith(directory + sep))) {
    throw new Error("Output is a protected legacy or implementation destination; choose a fresh artifact path.");
  }
  return path;
}

export async function writePhonemeArtifact(root: string, options: PhonemeBuildOptions): Promise<PhonemeReferenceEnvelope> {
  equal(options.policy, PHONEME_POLICY, "selection policy"); equal(options.units, PHONEME_UNITS, "event units");
  const bytes = await readFile(options.source);
  const text = bytes.toString("utf8");
  if (!bytes.equals(Buffer.from(text)) || bytesDigest(bytes) !== CMU_SHA256) throw new Error("Raw source bytes differ from pinned UTF-8 dictionary.");
  const output = await validatePhonemeOutputPath(root, options.out);
  const { parent, sources, parentBytes } = await readPhonemeInputs(root);
  const reference = buildJointReference(text);
  equal(reference, parent.artifact.reference, "complete source reconstruction");
  const envelope = createPhonemeEnvelope(parent, sources);
  validatePhonemeEnvelope(envelope, parent, sources);
  const serialized = JSON.stringify(envelope) + "\n";
  validatePhonemeEnvelope(JSON.parse(serialized), parent, sources);
  equal(await readSources(root, PHONEME_SOURCE_PATHS), sources, "implementation changed during build");
  equal(await readFile(resolve(root, PHONEME_PARENT_PATH)), parentBytes, "parent changed during build");
  equal(await readFile(options.source), bytes, "raw source changed during build");
  await writeFile(output, serialized, { flag: "wx" });
  return envelope;
}
