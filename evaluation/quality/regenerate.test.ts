import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { captureRun, readRun } from "./capture.js";
import { compareRuns, comparisonMarkdown } from "./compare.js";
import type { Draw, Manifest, Protocol, SourceArchive } from "./model.js";
import { compareWithMergeBase } from "./regenerate.js";
import { digest } from "./serialization.js";

const root = resolve(import.meta.dirname, "../..");
const protocol: Protocol = {
  schemaVersion: 1, id: "regenerate-test", wordsPerReplicate: 8, reviewDrawsPerReplicate: 2,
  profiles: [{ id: "lexicon", options: { mode: "lexicon", morphology: true }, seeds: { development: [42, 123], validation: [456, 789] } }],
};
const timeout = 120_000;

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

async function saveManifest(directory: string, manifest: Manifest): Promise<void> {
  await writeFile(join(directory, "manifest.json"), JSON.stringify({ manifest, digest: digest(manifest) }));
}

function commitAll(cwd: string, message: string): void {
  git(cwd, "-c", "user.name=Quality Test", "-c", "user.email=quality@example.invalid", "-c", "commit.gpgsign=false", "commit", "--no-verify", "-qam", message);
}

/** Copy a run, rewrite its review samples, and repin them so only the probe can notice. */
async function withReviewSamples(source: string, out: string, change: (samples: Draw[]) => void): Promise<void> {
  await cp(source, out, { recursive: true });
  const { manifest } = await readRun(out);
  const samples = JSON.parse(gunzipSync(await readFile(join(out, "review-samples.json.gz"))).toString()) as Draw[];
  change(samples);
  const bytes = gzipSync(`${JSON.stringify(samples)}\n`);
  await writeFile(join(out, "review-samples.json.gz"), bytes);
  const pinned = manifest.artifacts.find(item => item.file === "review-samples.json.gz")!;
  Object.assign(pinned, { sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length });
  await saveManifest(out, manifest);
}

/** Every numeric delta in a comparison report, keyed by its JSON path. */
function numericDeltas(value: unknown, path = "report", found: Array<[string, number]> = []): Array<[string, number]> {
  if (Array.isArray(value)) value.forEach((item, index) => numericDeltas(item, `${path}[${index}]`, found));
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (/delta|PercentagePoints$/i.test(key) && typeof item === "number") found.push([`${path}.${key}`, item]);
      else numericDeltas(item, `${path}.${key}`, found);
    }
  }
  return found;
}

describe("regenerated quality baselines", () => {
  let directory: string;
  let checkout: string;
  let committed: string;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "unglish-regenerate-"));
    checkout = join(directory, "checkout");
    committed = join(directory, "committed");
    // A separate generator revision: the harness tree plus one committed, output-neutral source edit.
    git(root, "worktree", "add", "--detach", checkout, "HEAD");
    await writeFile(join(checkout, "src/index.ts"), `${await readFile(join(checkout, "src/index.ts"), "utf8")}\n// Generator checkout fixture\n`);
    commitAll(checkout, "test: generator checkout fixture");
    await mkdir(committed);
    await captureRun({ root, generatorRoot: checkout, out: join(committed, "fixture-run"), id: "fixture-run", cohort: "development", protocol });
  }, timeout);
  afterAll(async () => {
    git(root, "worktree", "remove", "--force", checkout);
    await rm(directory, { recursive: true, force: true });
  });

  it("records the generator checkout's revision and sources, not the harness tree's", async () => {
    const { manifest } = await readRun(join(committed, "fixture-run"), true);
    const sources = JSON.parse(gunzipSync(await readFile(join(committed, "fixture-run/sources.json.gz"))).toString()) as SourceArchive;
    expect(manifest.generator.commit).toBe(git(checkout, "rev-parse", "HEAD"));
    expect(manifest.generator.commit).not.toBe(git(root, "rev-parse", "HEAD"));
    expect(manifest.generator).toMatchObject({ dirty: false, patch: "" });
    expect(manifest.generator.sourceDigest).toBe(digest(sources.generator));
    expect(sources.generator.find(file => file.path === "src/index.ts")?.content).toContain("Generator checkout fixture");
    await captureRun({ root, out: join(directory, "harness"), id: "harness", cohort: "development", protocol });
    expect((await readRun(join(directory, "harness"))).manifest.generator.sourceDigest).not.toBe(manifest.generator.sourceDigest);
    const nested = join(directory, "nested-root");
    await expect(captureRun({ root, generatorRoot: join(checkout, "evaluation"), out: nested, id: "nested", cohort: "development", protocol }))
      .rejects.toThrow("The generator root must be the top level of a Git checkout");
    await expect(stat(nested)).rejects.toThrow();
  }, timeout);

  it("passes the fidelity probe when regenerating a committed revision", async () => {
    const out = join(directory, "probed");
    await captureRun({ root, generatorRoot: checkout, committedRuns: committed, out, id: "probed", cohort: "development", protocol });
    const { manifest } = await readRun(out, true);
    const original = await readRun(join(committed, "fixture-run"));
    expect(manifest.fidelityProbes).toEqual([{ runId: "fixture-run", manifestDigest: digest(original.manifest), reviewDraws: 4 }]);
    const unrelated = join(directory, "other-cohort");
    await captureRun({ root, generatorRoot: checkout, committedRuns: committed, out: unrelated, id: "other-cohort", cohort: "validation", protocol });
    expect((await readRun(unrelated)).manifest.fidelityProbes).toBeUndefined();
  }, timeout);

  it.each([
    ["an altered", (samples: Draw[]) => { samples.find(draw => draw.seed === 123 && draw.drawIndex === 1)!.word.written.clean += "x"; },
      "regenerated lexicon seed 123 draw 1 differs from its committed review sample."],
    ["a missing", (samples: Draw[]) => { samples.splice(samples.findIndex(draw => draw.seed === 42 && draw.drawIndex === 1), 1); },
      "lexicon seed 42 draw 1 is missing from its review samples."],
    ["an extra", (samples: Draw[]) => { samples.push({ ...samples[0], drawIndex: 7 }); },
      "its review samples contain draws outside the protocol schedule."],
  ] as const)("refuses a regeneration against %s committed review sample and names the problem", async (kind, change, message) => {
    const altered = join(directory, `committed-${kind.replace(" ", "-")}`);
    await withReviewSamples(join(committed, "fixture-run"), join(altered, "fixture-run"), change);
    const out = join(directory, `refused-${kind.replace(" ", "-")}`);
    await expect(captureRun({ root, generatorRoot: checkout, committedRuns: altered, out, id: "refused", cohort: "development", protocol }))
      .rejects.toThrow(`Fidelity probe failed against committed run fixture-run (fixture-run): ${message}`);
    await expect(stat(out)).rejects.toThrow();
  }, timeout);

  it("discloses a reference from another environment only when a fidelity probe vouches for it", async () => {
    const foreignRoot = join(directory, "foreign");
    const foreign = join(foreignRoot, "fixture-run");
    await cp(join(committed, "fixture-run"), foreign, { recursive: true });
    const { manifest } = await readRun(foreign);
    manifest.environment.node = "v0.0.0-elsewhere";
    await saveManifest(foreign, manifest);

    const plain = await readRun(join(committed, "fixture-run"));
    const reference = await readRun(foreign);
    expect(() => compareRuns({ baseline: reference, candidate: plain })).toThrow("no run captured in the candidate's environment passed a fidelity probe");

    const probe = join(directory, "probe-run");
    await captureRun({ root, generatorRoot: checkout, committedRuns: foreignRoot, out: probe, id: "probe-run", cohort: "development", protocol });
    const probed = await readRun(probe);
    expect(() => compareRuns({ baseline: reference, candidate: probed }, { strictEnvironment: true })).toThrow("Runtime or dependency lock differs.");
    for (const report of [
      compareRuns({ baseline: reference, candidate: probed }),
      compareRuns({ baseline: reference, candidate: plain }, { probes: [probed.manifest] }),
    ]) {
      expect(report.environmentDifferences).toEqual([expect.objectContaining({
        role: "baseline", runId: "fixture-run", fidelityProbeRunId: "probe-run",
        generation: { reference: manifest.environment, candidate: plain.manifest.environment },
      })]);
      expect(comparisonMarkdown(report)).toContain("## Environment differences");
      expect(comparisonMarkdown(report)).toContain("strong evidence, not proof");
    }
    expect(compareRuns({ baseline: plain, candidate: probed })).not.toHaveProperty("environmentDifferences");

    const evaluated = join(directory, "evaluated-elsewhere");
    await cp(join(committed, "fixture-run"), evaluated, { recursive: true });
    const rescored = await readRun(evaluated);
    rescored.manifest.evaluationEnvironment = { ...rescored.manifest.environment, node: "v0.0.0-evaluator" };
    await saveManifest(evaluated, rescored.manifest);
    const previous = await readRun(evaluated);
    expect(() => compareRuns({ baseline: plain, previous, candidate: plain }, { strictEnvironment: true }))
      .toThrow("Evaluation runtime or dependency lock differs.");
    expect(() => compareRuns({ baseline: plain, previous, candidate: plain })).toThrow("The previous run fixture-run comes from a different runtime");
  }, timeout);

  it("compares a branch with its merge base in one command and reports zero deltas without generator changes", async () => {
    // A branch of the clean fixture checkout that changes no generator source, independent of local edits to this tree.
    const base = git(checkout, "rev-parse", "HEAD");
    await writeFile(join(checkout, "README.md"), `${await readFile(join(checkout, "README.md"), "utf8")}\nBranch fixture.\n`);
    commitAll(checkout, "docs: branch fixture outside the generator");
    const head = git(checkout, "rev-parse", "HEAD");
    const out = join(directory, "pull-request");
    const report = await compareWithMergeBase({ root: checkout, base, out, cohort: "development", protocol });
    const baseline = await readRun(join(out, "baseline"), true);
    const candidate = await readRun(join(out, "candidate"), true);
    expect(baseline.manifest.generator).toMatchObject({ commit: base, dirty: false });
    expect(candidate.manifest.generator).toMatchObject({ commit: head, dirty: false });
    expect(baseline.manifest.generator.sourceDigest).toBe(candidate.manifest.generator.sourceDigest);
    const deltas = numericDeltas(report);
    expect(deltas.length).toBeGreaterThan(100);
    expect(deltas.filter(([, value]) => value !== 0)).toEqual([]);
    expect(report).not.toHaveProperty("environmentDifferences");
    expect(JSON.parse(await readFile(join(out, "comparison.json"), "utf8"))).toEqual(report);
    expect(await readFile(join(out, "comparison.md"), "utf8")).toBe(comparisonMarkdown(report));
    expect(git(root, "worktree", "list")).not.toContain("unglish-quality-merge-base-");
    await expect(compareWithMergeBase({ root: checkout, base, out, cohort: "development", protocol })).rejects.toThrow();
  }, timeout);
});
