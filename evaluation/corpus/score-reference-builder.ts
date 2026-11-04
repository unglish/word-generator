import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { gunzipSync } from "node:zlib";
import { CMU_SHA256, sha256 } from "../review/wordlikeness/model.js";
import { CMU_COMPATIBILITY_POLICY, parseCmuRecords, selectCompatibleCmu } from "./cmu.js";
import { jsonDigest } from "./identity.js";
import { JOINT_SOURCE_PATHS, validateJointEnvelope, type JointEnvelope, type SourceFile } from "./joint-artifact.js";
import { buildJointReference, JOINT_REFERENCE_DIGEST, PHONE_PROJECTIONS, type JointReference } from "./joint.js";
import { TRANSITION_PARENT_PATH, TRANSITION_PARENT_SHA256, TRANSITION_PARENT_DIGEST, TRANSITION_SOURCE_PATHS,
  validateTransitionOutputPath } from "./transition-builder.js";
import { LEGACY_SCORER, SCORE_UNITS, scoreSelectedEntries, type ScoreReference } from "./score-reference.js";

export const SCORE_POLICY = CMU_COMPATIBILITY_POLICY;
export const SCORE_PROJECTION = PHONE_PROJECTIONS.base.id;
/** Includes the reused output guard's full transitive closure; no transition artifact is read. */
export const SCORE_SOURCE_PATHS = [...TRANSITION_SOURCE_PATHS, "evaluation/corpus/score-reference.ts",
  "evaluation/corpus/score-reference-builder.ts", "scripts/generate-baseline.ts", "src/phonotactic/score.ts",
  "src/phonotactic/arpabet-bigrams.ts"] as const;
export interface ScoreReferenceArtifact {
  version: "cmu-legacy-score-reference-artifact-v1";
  source: JointReference["source"]; parser: JointReference["parser"]; population: JointReference["population"];
  policy: typeof SCORE_POLICY; projection: typeof PHONE_PROJECTIONS.base;
  scorer: typeof LEGACY_SCORER; units: typeof SCORE_UNITS; scores: ScoreReference;
  parentReference: { version: "cmu-joint-reference-artifact-v1"; artifactDigest: string; referenceDigest: string; compressedFileSha256: string };
  license: SourceFile & { sha256: string };
  implementation: { digest: string; sources: SourceFile[]; packageLockSha256: string };
}
export interface ScoreReferenceEnvelope { digest: string; artifact: ScoreReferenceArtifact }
export interface ScoreBuildOptions { source: string; out: string; policy: string; projection: string; scorer: string }
/** Parent, full ordered scores and implementation must come from trusted reconstruction, never the candidate envelope. */
export interface TrustedScoreInputs { parent: JointEnvelope; scores: ScoreReference; sources: SourceFile[] }
const equal = (actual: unknown, expected: unknown, label: string): void => {
  if (!isDeepStrictEqual(actual, expected)) throw new Error(`Score reference ${label} mismatch.`);
};
const bytesDigest = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
const readSources = (root: string): Promise<SourceFile[]> => Promise.all(SCORE_SOURCE_PATHS.map(async path =>
  ({ path, content: await readFile(resolve(root, path), "utf8") })));

function validateSources(parent: JointEnvelope, sources: SourceFile[]): void {
  equal(sources.map(source => source.path), [...SCORE_SOURCE_PATHS], "implementation paths");
  for (const source of sources) {
    equal(Object.keys(source).sort(), ["content", "path"], "implementation fields");
    if (typeof source.content !== "string") throw new Error("Implementation source content must be text.");
  }
  equal(sha256(sources.find(source => source.path === "src/phonotactic/score.ts")!.content), LEGACY_SCORER.sourceSha256, "pinned historical scorer");
  equal(sha256(sources.find(source => source.path === "src/phonotactic/arpabet-bigrams.ts")!.content), LEGACY_SCORER.tableSha256, "pinned historical table");
  equal(parent.digest, TRANSITION_PARENT_DIGEST, "published joint parent");
  validateJointEnvelope(parent, sources.filter(source => (JOINT_SOURCE_PATHS as readonly string[]).includes(source.path)));
  equal(jsonDigest(parent.artifact.reference), JOINT_REFERENCE_DIGEST, "joint reference");
}

export function createScoreEnvelope(expected: TrustedScoreInputs): ScoreReferenceEnvelope {
  const { parent, scores, sources } = expected, reference = parent.artifact.reference;
  validateSources(parent, sources);
  equal(scores.entryDigest, reference.population.entryDigest, "selected entry digest");
  equal(scores.accounting, { selected: reference.population.accepted, scored: reference.population.accepted, invalid: 0, dropped: 0 }, "complete row accounting");
  equal(scores.rows.length, reference.population.accepted, "ordered row count");
  equal(scores.phoneEvents, reference.phones.native.total, "source phone count");
  equal(scores.transitionEvents, scores.phoneEvents + scores.rows.length, "n+1 transitions");
  const artifact: ScoreReferenceArtifact = structuredClone({
    version: "cmu-legacy-score-reference-artifact-v1", source: reference.source, parser: reference.parser, population: reference.population,
    policy: SCORE_POLICY, projection: PHONE_PROJECTIONS.base, scorer: LEGACY_SCORER, units: SCORE_UNITS, scores,
    parentReference: { version: "cmu-joint-reference-artifact-v1", artifactDigest: parent.digest,
      referenceDigest: JOINT_REFERENCE_DIGEST, compressedFileSha256: TRANSITION_PARENT_SHA256 },
    license: parent.artifact.license,
    implementation: { digest: jsonDigest(sources), sources, packageLockSha256: sha256(sources.find(source => source.path === "package-lock.json")!.content) },
  });
  return { digest: jsonDigest(artifact), artifact };
}

/** Compare all rows and their order against externally reconstructed expectations, not self-reported summaries. */
export function validateScoreEnvelope(value: unknown, expected: TrustedScoreInputs): asserts value is ScoreReferenceEnvelope {
  equal(value, createScoreEnvelope(expected), "full ordered rows, schema, identities or implementation");
}

export async function readScoreInputs(root: string): Promise<{ parent: JointEnvelope; sources: SourceFile[]; parentBytes: Buffer }> {
  const [sources, parentBytes] = await Promise.all([readSources(root), readFile(resolve(root, TRANSITION_PARENT_PATH))]);
  equal(bytesDigest(parentBytes), TRANSITION_PARENT_SHA256, "compressed parent bytes");
  const parent = JSON.parse(gunzipSync(parentBytes).toString("utf8")) as JointEnvelope;
  validateSources(parent, sources);
  return { parent, sources, parentBytes };
}

export function reconstructScores(bytes: Buffer, parent: JointEnvelope): ScoreReference {
  const text = bytes.toString("utf8");
  if (!bytes.equals(Buffer.from(text)) || bytesDigest(bytes) !== CMU_SHA256) throw new Error("Raw source bytes differ from pinned UTF-8 dictionary.");
  equal(buildJointReference(text), parent.artifact.reference, "complete source reconstruction");
  return scoreSelectedEntries(selectCompatibleCmu(parseCmuRecords(text)).entries);
}

export async function writeScoreArtifact(root: string, options: ScoreBuildOptions): Promise<ScoreReferenceEnvelope> {
  equal(options.policy, SCORE_POLICY, "selection policy"); equal(options.projection, SCORE_PROJECTION, "phone projection");
  equal(options.scorer, LEGACY_SCORER.id, "scorer profile");
  const out = await validateTransitionOutputPath(root, options.out, options.source), bytes = await readFile(options.source);
  const { parent, sources, parentBytes } = await readScoreInputs(root);
  const expected = { parent, sources, scores: reconstructScores(bytes, parent) }, envelope = createScoreEnvelope(expected);
  const serialized = JSON.stringify(envelope) + "\n";
  validateScoreEnvelope(JSON.parse(serialized), expected);
  equal(await readSources(root), sources, "source closure changed during build");
  equal(await readFile(resolve(root, TRANSITION_PARENT_PATH)), parentBytes, "parent changed during build");
  equal(await readFile(options.source), bytes, "raw source changed during build");
  await writeFile(out, serialized, { flag: "wx" });
  return envelope;
}
