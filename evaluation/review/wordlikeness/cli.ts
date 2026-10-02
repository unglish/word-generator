import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import type { ReviewExport, Snapshot } from "../model.js";
import { digest } from "../snapshot.js";
import { buildReference, CMU_REVISION, CMU_SHA256, SCORING_VERSION, sha256, type ReferenceModel } from "./model.js";
import { scoreSnapshots, type MachineArtifact } from "./artifact.js";
import { evaluate, evaluationMarkdown } from "./evaluate.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const [command, ...args] = process.argv.slice(2);
const { values } = parseArgs({ args, options: {
  corpus: { type: "string" }, model: { type: "string" }, scores: { type: "string" },
  snapshot: { type: "string", multiple: true }, input: { type: "string", multiple: true },
  out: { type: "string" }, run: { type: "string" },
} });
const required = (value: string | undefined, name: string) => { if (!value) throw new Error(`--${name} is required.`); return value; };
const load = async <T>(path: string): Promise<T> => JSON.parse(await readFile(resolve(path), "utf8"));
async function save(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value)}\n`, { flag: "wx", mode: 0o600 });
}
async function sourceDigest(paths: string[]): Promise<string> {
  return digest(await Promise.all(paths.map(async path => ({ path, sha256: sha256(await readFile(resolve(root, path), "utf8")) }))));
}
interface ModelArtifact { version: string; digest: string; implementation_digest: string; model: ReferenceModel }
async function main(): Promise<void> {
  const implementationDigest = await sourceDigest(["model.ts", "score.ts", "artifact.ts"].map(path => `evaluation/review/wordlikeness/${path}`));
  const comparatorDigest = await sourceDigest(["src/phonotactic/score.ts", "src/phonotactic/arpabet-bigrams.ts", "src/phonotactic/ipa-to-arpabet.ts"]);
  if (command === "build") {
    const text = await readFile(required(values.corpus, "corpus"), "utf8");
    if (sha256(text) !== CMU_SHA256) throw new Error("Corpus checksum does not match the pinned CMU revision.");
    const model = buildReference(text, CMU_REVISION);
    await save(resolve(required(values.out, "out")), { version: SCORING_VERSION, digest: digest(model), implementation_digest: implementationDigest, model });
    console.log(`Built reference model from ${model.corpus.accepted} spellings.`);
  } else if (command === "score") {
    const reference = await load<ModelArtifact>(required(values.model, "model"));
    if (reference.version !== SCORING_VERSION || reference.model.corpus.sha256 !== CMU_SHA256 || reference.digest !== digest(reference.model) || reference.implementation_digest !== implementationDigest) throw new Error("Reference model provenance mismatch; rebuild with this scoring version.");
    if (!values.snapshot?.length) throw new Error("At least one --snapshot is required.");
    const snapshots = await Promise.all(values.snapshot.map(path => load<Snapshot>(path)));
    await save(resolve(required(values.out, "out")), scoreSnapshots(snapshots, reference.model, implementationDigest, comparatorDigest));
    console.log(`Scored ${snapshots.length} frozen studies; no words regenerated.`);
  } else if (command === "evaluate") {
    if (!values.input?.length) throw new Error("At least one private --input export is required.");
    const run = required(values.run, "run");
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(run)) throw new Error("Use a lowercase alphanumeric/hyphen run name.");
    const exports = await Promise.all(values.input.map(path => load<ReviewExport>(path)));
    const artifact = await load<MachineArtifact>(required(values.scores, "scores"));
    if (artifact.implementation_digest !== implementationDigest || artifact.comparator_digest !== comparatorDigest) throw new Error("Machine scores were produced by different scoring code; rebuild before evaluating.");
    const report = evaluate(exports, artifact);
    const parent = resolve(root, "review-exports/wordlikeness");
    await mkdir(parent, { recursive: true, mode: 0o700 });
    if (await realpath(parent) !== parent) throw new Error("Private output directory must not traverse symlinks.");
    const out = resolve(parent, run);
    await mkdir(out, { mode: 0o700 });
    await save(resolve(out, "report.json"), { ...report, evaluation_implementation_digest: await sourceDigest(["evaluation/review/wordlikeness/evaluate.ts", "evaluation/review/wordlikeness/cli.ts"]) });
    await writeFile(resolve(out, "report.md"), evaluationMarkdown(report), { flag: "wx", mode: 0o600 });
    console.log(`Private report written to ${out}.`);
  } else throw new Error("Use build, score, or evaluate.");
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Wordlikeness command failed."); process.exitCode = 1; });
