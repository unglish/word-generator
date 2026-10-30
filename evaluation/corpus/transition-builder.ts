import { createHash } from "node:crypto";
import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { gunzipSync } from "node:zlib";
import { CMU_SHA256, sha256 } from "../review/wordlikeness/model.js";
import { CMU_COMPATIBILITY_POLICY, parseCmuRecords, selectCompatibleCmu } from "./cmu.js";
import { jsonDigest } from "./identity.js";
import { JOINT_SOURCE_PATHS, validateJointEnvelope, type JointEnvelope, type SourceFile } from "./joint-artifact.js";
import { buildJointReference, JOINT_REFERENCE_DIGEST, PHONE_PROJECTIONS, type JointReference } from "./joint.js";
import { countPhoneTransitions, TRANSITION_BOUNDARIES, type PhoneTransitions } from "./phone-transitions.js";

export const TRANSITION_POLICY = CMU_COMPATIBILITY_POLICY;
export const TRANSITION_UNITS = "integer-phone-transition-occurrences";
export const TRANSITION_PARENT_PATH = "evaluation/experiments/cmu-matched-reference/reference.json.gz";
export const TRANSITION_PARENT_SHA256 = "d7b32d1c6f49edf8211f96db14139086172288f138328d37b41ae144b685a118";
export const TRANSITION_PARENT_DIGEST = "f8f5bdd9a083772f76cbb7b9db78ddebb67bcea5fa04afbccfb20f6b0a628862";
export const TRANSITION_SOURCE_PATHS = [
  ...JOINT_SOURCE_PATHS, "evaluation/corpus/phone-transitions.ts", "evaluation/corpus/transition-builder.ts",
  "scripts/generate-bigram-table.ts", "package-lock.json",
] as const;
export interface TransitionReferenceArtifact {
  version: "cmu-phone-transition-reference-artifact-v1";
  source: JointReference["source"];
  parser: JointReference["parser"];
  population: JointReference["population"];
  policy: typeof TRANSITION_POLICY;
  units: typeof TRANSITION_UNITS;
  boundaries: typeof TRANSITION_BOUNDARIES;
  projections: typeof PHONE_PROJECTIONS;
  transitions: PhoneTransitions;
  parentReference: { version: "cmu-joint-reference-artifact-v1"; artifactDigest: string; referenceDigest: string; compressedFileSha256: string };
  license: SourceFile & { sha256: string };
  implementation: { digest: string; sources: SourceFile[]; packageLockSha256: string };
}
export interface TransitionReferenceEnvelope { digest: string; artifact: TransitionReferenceArtifact }
export interface TransitionBuildOptions { source: string; out: string; policy: string; units: string }
/** Expected tables must be reconstructed from trusted source bytes, never extracted from the candidate envelope. */
export interface TrustedTransitionInputs { parent: JointEnvelope; transitions: PhoneTransitions; sources: SourceFile[] }

function equal(actual: unknown, expected: unknown, label: string): void {
  if (!isDeepStrictEqual(actual, expected)) throw new Error(`Transition reference ${label} mismatch.`);
}
const bytesDigest = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
const readSources = (root: string): Promise<SourceFile[]> => Promise.all(TRANSITION_SOURCE_PATHS.map(async path =>
  ({ path, content: await readFile(resolve(root, path), "utf8") })));

function validateParent(parent: JointEnvelope, sources: SourceFile[]): void {
  equal(parent.digest, TRANSITION_PARENT_DIGEST, "published parent identity");
  validateJointEnvelope(parent, sources.filter(source => (JOINT_SOURCE_PATHS as readonly string[]).includes(source.path)));
  equal(jsonDigest(parent.artifact.reference), JOINT_REFERENCE_DIGEST, "published reference identity");
}

/** Conservation checks supplement, but do not replace, comparison with externally reconstructed pairs. */
function validateConservation(transitions: PhoneTransitions, reference: JointReference): void {
  equal(transitions.entries, reference.population.accepted, "selected entry count");
  equal(transitions.entryDigest, reference.population.entryDigest, "selected entry identities");
  equal(transitions.phoneEvents, reference.phones.native.total, "source phone events");
  for (const view of ["native", "base"] as const) {
    const table = transitions[view], expected = { ...reference.phones[view].counts, "#": transitions.entries };
    const rows: Record<string, number> = {}, columns: Record<string, number> = {};
    for (const [first, row] of Object.entries(table.counts)) {
      if (!Object.keys(row).length) throw new Error("Empty transition row.");
      for (const [second, count] of Object.entries(row)) {
        if (!Number.isSafeInteger(count) || count <= 0) throw new Error("Transition counts must be positive safe integers.");
        if (first === "#" && second === "#") throw new Error("Boundary-to-boundary transitions are not allowed.");
        rows[first] = (rows[first] ?? 0) + count;
        columns[second] = (columns[second] ?? 0) + count;
      }
    }
    equal(rows, expected, `${view} outgoing phone marginal`);
    equal(columns, expected, `${view} incoming phone marginal`);
    equal(table.rowTotals, rows, `${view} row totals`);
    equal(table.vocabulary, Object.keys(expected).sort(), `${view} observed vocabulary`);
    equal(table.total, Object.values(rows).reduce((sum, value) => sum + value, 0), `${view} event count`);
    equal(table.total, transitions.phoneEvents + transitions.entries, `${view} conservation`);
  }
}

export function createTransitionEnvelope(expected: TrustedTransitionInputs): TransitionReferenceEnvelope {
  const { parent, transitions, sources } = expected;
  equal(sources.map(source => source.path), [...TRANSITION_SOURCE_PATHS], "implementation paths");
  for (const source of sources) {
    equal(Object.keys(source).sort(), ["content", "path"], "implementation source fields");
    if (typeof source.content !== "string") throw new Error("Implementation source content must be text.");
  }
  validateParent(parent, sources);
  validateConservation(transitions, parent.artifact.reference);
  const artifact: TransitionReferenceArtifact = structuredClone({
    version: "cmu-phone-transition-reference-artifact-v1", source: parent.artifact.reference.source,
    parser: parent.artifact.reference.parser, population: parent.artifact.reference.population,
    policy: TRANSITION_POLICY, units: TRANSITION_UNITS, boundaries: TRANSITION_BOUNDARIES,
    projections: PHONE_PROJECTIONS, transitions,
    parentReference: { version: "cmu-joint-reference-artifact-v1", artifactDigest: parent.digest,
      referenceDigest: JOINT_REFERENCE_DIGEST, compressedFileSha256: TRANSITION_PARENT_SHA256 },
    license: parent.artifact.license,
    implementation: { digest: jsonDigest(sources), sources,
      packageLockSha256: sha256(sources.find(source => source.path === "package-lock.json")!.content) },
  });
  return { digest: jsonDigest(artifact), artifact };
}

/** The entire externally expected table is required: conserving every marginal is not sufficient. */
export function validateTransitionEnvelope(value: unknown, expected: TrustedTransitionInputs): asserts value is TransitionReferenceEnvelope {
  equal(value, createTransitionEnvelope(expected), "full table, schema, identity, or expected implementation");
}

export async function readTransitionInputs(root: string): Promise<{ parent: JointEnvelope; sources: SourceFile[]; parentBytes: Buffer }> {
  const [sources, parentBytes] = await Promise.all([readSources(root), readFile(resolve(root, TRANSITION_PARENT_PATH))]);
  equal(bytesDigest(parentBytes), TRANSITION_PARENT_SHA256, "compressed parent bytes");
  const parent = JSON.parse(gunzipSync(parentBytes).toString("utf8")) as JointEnvelope;
  validateParent(parent, sources);
  return { parent, sources, parentBytes };
}

/** Resolve existing directory aliases, including the nearest existing ancestor of a missing target. */
async function canonicalPath(path: string): Promise<string> {
  try { return await realpath(path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const parent = dirname(path);
    if (parent === path) throw error;
    return join(await canonicalPath(parent), basename(path));
  }
}
export async function validateTransitionOutputPath(root: string, out: string, source?: string): Promise<string> {
  const realRoot = await realpath(root), target = resolve(out);
  const path = join(await realpath(dirname(target)), basename(target));
  const protectedDirectories = await Promise.all([
    "src", "data/cmu", "demo", "scripts", "evaluation/corpus", "evaluation/review", "evaluation/experiments",
  ].map(directory => canonicalPath(resolve(realRoot, directory))));
  const protectedFiles = await Promise.all([...TRANSITION_SOURCE_PATHS, "package.json", "tsconfig.corpus.json", "tsconfig.review.json"]
    .map(file => canonicalPath(resolve(realRoot, file))));
  if (source) protectedFiles.push(await canonicalPath(resolve(source)));
  if (protectedFiles.includes(path) || protectedDirectories.some(directory => path === directory || path.startsWith(directory + sep))) {
    throw new Error("Output is a protected source, runtime, demo, or frozen experiment destination; choose a fresh artifact path.");
  }
  try {
    await lstat(path);
    throw new Error("Output already exists; files and symlinks cannot be overwritten.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return path;
}

export function reconstructTransitions(bytes: Buffer, parent: JointEnvelope): PhoneTransitions {
  const text = bytes.toString("utf8");
  if (!bytes.equals(Buffer.from(text)) || bytesDigest(bytes) !== CMU_SHA256) throw new Error("Raw source bytes differ from pinned UTF-8 dictionary.");
  equal(buildJointReference(text), parent.artifact.reference, "complete source reconstruction");
  const transitions = countPhoneTransitions(selectCompatibleCmu(parseCmuRecords(text)).entries);
  validateConservation(transitions, parent.artifact.reference);
  return transitions;
}
export async function writeTransitionArtifact(root: string, options: TransitionBuildOptions): Promise<TransitionReferenceEnvelope> {
  equal(options.policy, TRANSITION_POLICY, "selection policy"); equal(options.units, TRANSITION_UNITS, "event units");
  const output = await validateTransitionOutputPath(root, options.out, options.source);
  const bytes = await readFile(options.source);
  const { parent, sources, parentBytes } = await readTransitionInputs(root);
  const transitions = reconstructTransitions(bytes, parent);
  const expected = { parent, sources, transitions }, envelope = createTransitionEnvelope(expected);
  const serialized = JSON.stringify(envelope) + "\n";
  validateTransitionEnvelope(JSON.parse(serialized), expected);
  equal(await readSources(root), sources, "implementation changed during build");
  equal(await readFile(resolve(root, TRANSITION_PARENT_PATH)), parentBytes, "parent changed during build");
  equal(await readFile(options.source), bytes, "raw source changed during build");
  await writeFile(output, serialized, { flag: "wx" });
  return envelope;
}
