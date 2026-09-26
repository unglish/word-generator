import { createHash } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { gunzipSync } from "node:zlib";
import { CMU_SHA256, sha256 } from "../review/wordlikeness/model.js";
import { jsonDigest } from "./identity.js";
import { buildJointReference, JOINT_REFERENCE_DIGEST, type JointLengths, type JointReference } from "./joint.js";
import { JOINT_SOURCE_PATHS, validateJointEnvelope, type JointEnvelope, type SourceFile } from "./joint-artifact.js";

export const LENGTH_POLICY = "cmu-ascii-first-v1";
export const LENGTH_UNITS = "integer-selected-entry-counts";
export const LENGTH_AXES = {
  written: "ascii-letter-count", phones: "validated-cmu-token-count",
  syllables: "explicitly-stress-marked-vowel-token-count", conditional: "syllable-count",
} as const;
export const LENGTH_PARENT_PATH = "evaluation/experiments/cmu-matched-reference/reference.json.gz";
export const LENGTH_PARENT_SHA256 = "d7b32d1c6f49edf8211f96db14139086172288f138328d37b41ae144b685a118";
export const LENGTH_PARENT_DIGEST = "f8f5bdd9a083772f76cbb7b9db78ddebb67bcea5fa04afbccfb20f6b0a628862";
export const LENGTH_SOURCE_PATHS = [
  ...JOINT_SOURCE_PATHS, "scripts/build-cmu-baseline.ts", "evaluation/corpus/length-builder.ts", "package-lock.json",
] as const;

export interface LengthReferenceArtifact {
  version: "cmu-length-reference-artifact-v1";
  source: JointReference["source"];
  parser: JointReference["parser"];
  population: JointReference["population"];
  policy: typeof LENGTH_POLICY;
  units: typeof LENGTH_UNITS;
  axes: typeof LENGTH_AXES;
  lengths: JointLengths;
  parentReference: { version: "cmu-joint-reference-artifact-v1"; artifactDigest: string; referenceDigest: string; compressedFileSha256: string };
  license: SourceFile & { sha256: string };
  implementation: { digest: string; sources: SourceFile[]; packageLockSha256: string };
}
export interface LengthReferenceEnvelope { digest: string; artifact: LengthReferenceArtifact }
export interface LengthBuildOptions { source: string; out: string; policy: string; units: string }

function equal(actual: unknown, expected: unknown, label: string): void {
  if (!isDeepStrictEqual(actual, expected)) throw new Error(`Length reference ${label} mismatch.`);
}
const bytesDigest = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
const readSources = (root: string, paths: readonly string[]): Promise<SourceFile[]> =>
  Promise.all(paths.map(async path => ({ path, content: await readFile(resolve(root, path), "utf8") })));

function validateParent(parent: JointEnvelope, sources: SourceFile[]): void {
  equal(parent.digest, LENGTH_PARENT_DIGEST, "published parent identity");
  validateJointEnvelope(parent, sources.filter(source => (JOINT_SOURCE_PATHS as readonly string[]).includes(source.path)));
  equal(jsonDigest(parent.artifact.reference), JOINT_REFERENCE_DIGEST, "published reference identity");
}

/** Derive exact entry-count tables; the writer separately reconstructs them from pinned raw bytes. */
export function createLengthEnvelope(parent: JointEnvelope, sources: SourceFile[]): LengthReferenceEnvelope {
  equal(sources.map(source => source.path), [...LENGTH_SOURCE_PATHS], "implementation paths");
  for (const source of sources) {
    equal(Object.keys(source).sort(), ["content", "path"], "implementation source fields");
    if (typeof source.content !== "string") throw new Error("Implementation source content must be text.");
  }
  validateParent(parent, sources);
  const { reference } = parent.artifact;
  const artifact: LengthReferenceArtifact = structuredClone({
    version: "cmu-length-reference-artifact-v1", source: reference.source, parser: reference.parser,
    population: reference.population, policy: LENGTH_POLICY, units: LENGTH_UNITS, axes: LENGTH_AXES,
    lengths: reference.lengths,
    parentReference: { version: "cmu-joint-reference-artifact-v1", artifactDigest: parent.digest,
      referenceDigest: JOINT_REFERENCE_DIGEST, compressedFileSha256: LENGTH_PARENT_SHA256 },
    license: parent.artifact.license,
    implementation: { digest: jsonDigest(sources), sources,
      packageLockSha256: sha256(sources.find(source => source.path === "package-lock.json")!.content) },
  });
  return { digest: jsonDigest(artifact), artifact };
}

/** Externally expected reviewed sources are required, independently of embedded digest consistency. */
export function validateLengthEnvelope(envelope: unknown, parent: JointEnvelope, expectedSources: SourceFile[]): asserts envelope is LengthReferenceEnvelope {
  equal(envelope, createLengthEnvelope(parent, expectedSources), "artifact, counts, schema, or expected implementation");
}

export async function readLengthInputs(root: string): Promise<{ parent: JointEnvelope; sources: SourceFile[]; parentBytes: Buffer }> {
  const [sources, parentBytes] = await Promise.all([
    readSources(root, LENGTH_SOURCE_PATHS), readFile(resolve(root, LENGTH_PARENT_PATH)),
  ]);
  equal(bytesDigest(parentBytes), LENGTH_PARENT_SHA256, "compressed parent bytes");
  const parent = JSON.parse(gunzipSync(parentBytes).toString("utf8")) as JointEnvelope;
  validateParent(parent, sources);
  return { parent, sources, parentBytes };
}

/** Local publication guard: frozen earlier builders remain unchanged. */
export async function validateLengthOutputPath(root: string, out: string): Promise<string> {
  const [realRoot, parent] = await Promise.all([realpath(root), realpath(dirname(resolve(out)))]);
  const path = join(parent, basename(out));
  const directoryPath = async (path: string): Promise<string> => {
    try { return await realpath(path); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return path; throw error; }
  };
  const protectedFiles = await Promise.all([
    ...LENGTH_SOURCE_PATHS, "scripts/build-cmu-phoneme-baseline.mjs", "demo/cmuBaselines.js", "demo/index.html",
  ].map(async file => join(await directoryPath(dirname(resolve(realRoot, file))), basename(file))));
  const protectedDirectories = await Promise.all([
    "src", "data/cmu", "evaluation/corpus", "evaluation/review/wordlikeness/artifacts",
    "evaluation/experiments/cmu-shared-parser", "evaluation/experiments/cmu-matched-reference",
    "evaluation/experiments/cmu-phoneme-builder",
  ].map(directory => directoryPath(resolve(realRoot, directory))));
  if (protectedFiles.includes(path) || protectedDirectories.some(directory => path === directory || path.startsWith(directory + sep))) {
    throw new Error("Output is a protected legacy, runtime, or frozen implementation destination; choose a fresh artifact path.");
  }
  return path;
}

export async function writeLengthArtifact(root: string, options: LengthBuildOptions): Promise<LengthReferenceEnvelope> {
  equal(options.policy, LENGTH_POLICY, "selection policy"); equal(options.units, LENGTH_UNITS, "event units");
  const bytes = await readFile(options.source);
  const text = bytes.toString("utf8");
  if (!bytes.equals(Buffer.from(text)) || bytesDigest(bytes) !== CMU_SHA256) throw new Error("Raw source bytes differ from pinned UTF-8 dictionary.");
  const output = await validateLengthOutputPath(root, options.out);
  const { parent, sources, parentBytes } = await readLengthInputs(root);
  equal(buildJointReference(text), parent.artifact.reference, "complete source reconstruction");
  const envelope = createLengthEnvelope(parent, sources);
  const serialized = JSON.stringify(envelope) + "\n";
  validateLengthEnvelope(JSON.parse(serialized), parent, sources);
  equal(await readSources(root, LENGTH_SOURCE_PATHS), sources, "implementation changed during build");
  equal(await readFile(resolve(root, LENGTH_PARENT_PATH)), parentBytes, "parent changed during build");
  equal(await readFile(options.source), bytes, "raw source changed during build");
  await writeFile(output, serialized, { flag: "wx" });
  return envelope;
}
