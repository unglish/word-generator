import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { CMU_SHA256 } from "../review/wordlikeness/model.js";
import { CMU_COMPATIBILITY_POLICY, parseCmuRecords, selectCompatibleCmu, type SelectedCmuEntry } from "./cmu.js";
import { jsonDigest } from "./identity.js";
import { TRANSITION_SOURCE_PATHS, validateTransitionOutputPath } from "./transition-builder.js";
import { constituentObservations, fitConditionalModel, NUCLEUS_CLASSES, splitEntries } from "./conditional-onset-rime.js";
import { compareConditionalModels, conditionalSupportDiagnostics, likelihoodSummary, selectSmoothing } from "./conditional-experiment.js";

export const CONDITIONAL_REGISTRATION_PATH = "evaluation/experiments/conditional-onset-rime/measurement-preimplementation.json";
export const CONDITIONAL_REGISTRATION_SHA256 = "c39d8b61a76442ec717a081d3d483122b0246c745d49ecae898f1e1f57965f06";
const LICENSE_PATH = "evaluation/review/wordlikeness/artifacts/CMUDICT-LICENSE.txt";
const LICENSE_SHA256 = "bd4ce8e44170a5f9f481310ca85c51de3c4f851a65e679b40e603b143bd3542a";
export const CONDITIONAL_SOURCE_PATHS = [
  ...TRANSITION_SOURCE_PATHS, "evaluation/corpus/conditional-onset-rime.ts", "evaluation/corpus/conditional-experiment.ts",
  "evaluation/corpus/conditional-builder.ts", "evaluation/corpus/conditional-cli.ts", CONDITIONAL_REGISTRATION_PATH,
] as const;
const bytesDigest = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");

export interface ConditionalRegistration {
  version: "q17-conditional-onset-rime-v1";
  source: { revision: string; sha256: string; selection: string; weighting: string };
  split: { seed: string; training: number[]; development: number[]; heldOut: number[] };
  contexts: { nucleusClasses: unknown };
  models: { alphaGrid: number[] };
}
export function readConditionalRegistration(bytes: Buffer): ConditionalRegistration {
  if (bytesDigest(bytes) !== CONDITIONAL_REGISTRATION_SHA256) throw new Error("Conditional experiment registration changed.");
  const value = JSON.parse(bytes.toString("utf8")) as ConditionalRegistration;
  if (value.version !== "q17-conditional-onset-rime-v1" || value.source.sha256 !== CMU_SHA256
    || value.source.selection !== CMU_COMPATIBILITY_POLICY || !isDeepStrictEqual(value.contexts.nucleusClasses, NUCLEUS_CLASSES)
    || !isDeepStrictEqual(value.split.training, [0, 7999]) || !isDeepStrictEqual(value.split.development, [8000, 8999])
    || !isDeepStrictEqual(value.split.heldOut, [9000, 9999])) throw new Error("Unsupported conditional experiment registration.");
  return value;
}
function entryIdentity(entries: readonly SelectedCmuEntry[]): { entries: number; digest: string } {
  const projection = entries.map(({ line, label, spelling, tokens }) => ({ line, label, spelling, tokens }));
  return { entries: entries.length, digest: bytesDigest(Buffer.from(JSON.stringify(projection))) };
}

export function constructConditionalExperiment(bytes: Buffer, registrationBytes: Buffer): ReturnType<typeof buildConditionalExperiment> {
  const registration = readConditionalRegistration(registrationBytes);
  const text = bytes.toString("utf8");
  if (bytesDigest(bytes) !== CMU_SHA256 || !bytes.equals(Buffer.from(text))) throw new Error("Raw source differs from pinned UTF-8 dictionary.");
  return buildConditionalExperiment(text, registration);
}
function buildConditionalExperiment(text: string, registration: ConditionalRegistration) {
  const selection = selectCompatibleCmu(parseCmuRecords(text));
  if (selection.entries.length !== 117485) throw new Error("Pinned source selection population changed.");
  const splits = splitEntries(selection.entries, registration.split.seed);
  if (Object.values(splits).some(entries => !entries.length)) throw new Error("Every registered split must contain entries.");
  const model = fitConditionalModel(splits.training);
  const onsets = new Set(model.initialOnsets);
  const development = constituentObservations(splits.development, onsets);
  const baseline = selectSmoothing(model, development, registration.models.alphaGrid, "baseline");
  const candidate = selectSmoothing(model, development, registration.models.alphaGrid, "candidate");
  // No held-out observation is constructed until both development choices are fixed.
  const heldOut = constituentObservations(splits.heldOut, onsets);
  const comparison = compareConditionalModels(model, heldOut, baseline.alpha, candidate.alpha);
  return {
    version: "conditional-onset-rime-experiment-v1" as const,
    source: registration.source,
    selection: { policy: selection.policy, ...entryIdentity(selection.entries), excluded: selection.excluded },
    splits: Object.fromEntries(Object.entries(splits).map(([name, entries]) => [name, entryIdentity(entries)])),
    model,
    development: { baseline, candidate },
    heldOut: {
      baseline: likelihoodSummary(model, heldOut, baseline.alpha, "baseline"),
      candidate: likelihoodSummary(model, heldOut, candidate.alpha, "candidate"),
      ...comparison,
    },
    support: conditionalSupportDiagnostics(model, baseline.alpha, candidate.alpha),
    interpretation: "Matched held-out conditional corpus prediction with inferred syllables. Native dictionary types, not running-text frequencies or human judgments. No generator output or diversity change is measured.",
  };
}
const readSources = (root: string) => Promise.all(CONDITIONAL_SOURCE_PATHS.map(async path =>
  ({ path, content: await readFile(resolve(root, path), "utf8") })));

export async function writeConditionalExperiment(root: string, source: string, out: string): Promise<{ digest: string; artifact: unknown }> {
  const actualRoot = await realpath(root);
  const moduleRoot = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), "../.."));
  if (actualRoot !== moduleRoot) throw new Error("Builder module must come from the measured checkout.");
  const git = (...args: string[]) => execFileSync("git", args, { cwd: actualRoot, encoding: "utf8" }).trim();
  git("ls-files", "--error-unmatch", ...CONDITIONAL_SOURCE_PATHS);
  if (git("status", "--porcelain", "--untracked-files=no")) throw new Error("Commit measured inputs before fitting.");
  for (const key of ["NODE_OPTIONS", "NODE_PATH", "ESBUILD_BINARY_PATH", "TSX_TSCONFIG_PATH"]) {
    if (process.env[key]) throw new Error(`Unpinned execution override: ${key}`);
  }
  const commit = git("rev-parse", "HEAD");
  const output = await validateTransitionOutputPath(actualRoot, out, source);
  const [bytes, sources, licenseBytes, nodeBytes] = await Promise.all([
    readFile(source), readSources(actualRoot), readFile(resolve(actualRoot, LICENSE_PATH)), readFile(process.execPath),
  ]);
  if (bytesDigest(licenseBytes) !== LICENSE_SHA256) throw new Error("CMU license changed.");
  const registrationBytes = Buffer.from(sources.find(file => file.path === CONDITIONAL_REGISTRATION_PATH)!.content);
  const experiment = constructConditionalExperiment(bytes, registrationBytes);
  const artifact = {
    ...experiment, registrationSha256: bytesDigest(registrationBytes),
    license: { path: LICENSE_PATH, content: licenseBytes.toString("utf8"), sha256: LICENSE_SHA256 },
    implementation: { commit, sources, digest: jsonDigest(sources), packageLockSha256: bytesDigest(await readFile(resolve(actualRoot, "package-lock.json"))) },
    runtime: { nodeVersion: process.version, nodeExecutableSha256: bytesDigest(nodeBytes),
      dependencyAttestation: "Lockfile declarations recorded; installed loader binaries require a separate execution seal." },
  };
  const envelope = { digest: jsonDigest(artifact), artifact };
  const serialized = JSON.stringify(envelope) + "\n";
  const roundTrip = JSON.parse(serialized);
  if (roundTrip.digest !== jsonDigest(roundTrip.artifact) || !isDeepStrictEqual(roundTrip, envelope)) throw new Error("Experiment serialization changed its identity or content.");
  if (!isDeepStrictEqual(await readSources(actualRoot), sources) || !isDeepStrictEqual(await readFile(source), bytes)
    || !isDeepStrictEqual(await readFile(resolve(actualRoot, LICENSE_PATH)), licenseBytes)
    || !isDeepStrictEqual(await readFile(process.execPath), nodeBytes)
    || git("rev-parse", "HEAD") !== commit || git("status", "--porcelain", "--untracked-files=no")) {
    throw new Error("Measured execution inputs changed during fitting.");
  }
  await writeFile(output, serialized, { flag: "wx" });
  return envelope;
}
