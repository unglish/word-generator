import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { captureRun, readRun } from "./capture.js";
import { compareRuns, comparisonMarkdown } from "./compare.js";
import type { Draw, Manifest, Protocol, SourceArchive } from "./model.js";
import { git } from "./git.js";
import { compareWithMergeBase } from "./regenerate.js";
import { digest } from "./serialization.js";

const root = resolve(import.meta.dirname, "../..");
const protocol: Protocol = {
  schemaVersion: 1, id: "regenerate-test", wordsPerReplicate: 8, reviewDrawsPerReplicate: 2,
  profiles: [{ id: "lexicon", options: { mode: "lexicon", morphology: true }, seeds: { development: [42, 123], validation: [456, 789] } }],
};
const timeout = 120_000;


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
    await expect(captureRun({ root, generatorRoot: join(directory, "missing"), out: nested, id: "nested", cohort: "development", protocol }))
      .rejects.toThrow(`The generator root does not exist: ${join(directory, "missing")}`);
  }, timeout);

  it("ignores repository variables exported by a calling git hook", async () => {
    // A hook running `npm test` exports variables for its own repository; they must not redirect provenance or writes.
    const decoy = join(directory, "decoy");
    await mkdir(decoy);
    git(decoy, "init", "-q");
    const saved = { dir: process.env.GIT_DIR, index: process.env.GIT_INDEX_FILE };
    Object.assign(process.env, { GIT_DIR: join(decoy, ".git"), GIT_INDEX_FILE: join(decoy, ".git/index") });
    try {
      const out = join(directory, "under-hook");
      await captureRun({ root, generatorRoot: checkout, out, id: "under-hook", cohort: "development", protocol });
      const { manifest } = await readRun(out);
      expect(manifest.generator).toMatchObject({ commit: (await readRun(join(committed, "fixture-run"))).manifest.generator.commit, dirty: false, patch: "" });
    } finally {
      for (const [name, value] of [["GIT_DIR", saved.dir], ["GIT_INDEX_FILE", saved.index]] as const) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
    await expect(stat(join(decoy, ".git/index"))).rejects.toThrow();
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

  it("skips incomplete local runs without skipping a completed run's probe", async () => {
    const inputs = join(directory, "incomplete-inputs");
    await cp(committed, inputs, { recursive: true });
    await mkdir(join(inputs, "interrupted"));
    const out = join(directory, "past-incomplete");
    await captureRun({ root, generatorRoot: checkout, committedRuns: inputs, out, id: "past-incomplete", cohort: "development", protocol });
    expect((await readRun(out)).manifest.fidelityProbes).toEqual([
      { runId: "fixture-run", manifestDigest: digest((await readRun(join(committed, "fixture-run"))).manifest), reviewDraws: 4 },
    ]);
  }, timeout);

  it.each([false, true])("refuses a missing tracked manifest even when its entire directory is removed: %s", async removeDirectory => {
    const path = "evaluation/quality/baselines/missing-tracked";
    const run = join(checkout, path);
    await mkdir(run);
    await cp(join(committed, "fixture-run/manifest.json"), join(run, "manifest.json"));
    git(checkout, "add", "--", `${path}/manifest.json`);
    try {
      await rm(removeDirectory ? run : join(run, "manifest.json"), { recursive: true });
      const out = join(directory, `missing-tracked-${removeDirectory}`);
      await expect(captureRun({ root: checkout, out, id: "refused", cohort: "development", protocol }))
        .rejects.toThrow(`Cannot read committed-run manifest at ${run}.`);
      await expect(stat(out)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      git(checkout, "reset", "--", path);
      await rm(run, { recursive: true, force: true });
    }
  }, timeout);

  it.each(["manifest.json", "summary.json", "review-samples.json.gz"])("refuses damaged historical evidence: %s", async file => {
    const inputs = join(directory, `damaged-${file}`);
    const run = join(inputs, "fixture-run");
    await cp(join(committed, "fixture-run"), run, { recursive: true });
    await writeFile(join(run, file), "damaged evidence");
    const out = join(directory, `refused-${file}`);
    await expect(captureRun({ root, generatorRoot: checkout, committedRuns: inputs, out, id: "refused", cohort: "development", protocol }))
      .rejects.toThrow(`Invalid committed run at ${run}:`);
    await expect(stat(out)).rejects.toMatchObject({ code: "ENOENT" });
  }, timeout);

  it.each([
    ["createSeededRng", "undefined", "a createSeededRng function"],
    ["generateWord", "42", "a generateWord function"],
    ["englishConfig", "undefined", "an englishConfig object"],
    ["englishConfig", "null", "an englishConfig object"],
    ["englishConfig", "[]", "an englishConfig object"],
  ])("names the checkout and invalid export %s = %s", async (name, value, description) => {
    const generatorRoot = await mkdtemp(join(directory, "invalid-api-"));
    await mkdir(join(generatorRoot, "src"));
    const exports = { createSeededRng: "() => () => 0", generateWord: "() => null", englishConfig: "{}", [name]: value };
    await writeFile(join(generatorRoot, "src/index.ts"), Object.entries(exports).map(([key, expression]) => `export const ${key} = ${expression};`).join("\n"));
    git(generatorRoot, "init", "-q");
    const out = join(generatorRoot, "result");
    await expect(captureRun({ root, generatorRoot, out, id: "invalid-api", cohort: "development", protocol }))
      .rejects.toThrow(`Generator checkout ${generatorRoot} must export ${description} from src/index.ts.`);
    await expect(stat(out)).rejects.toMatchObject({ code: "ENOENT" });
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
    const evaluationProbe = join(directory, "evaluation-probe");
    const evaluationInputs = join(directory, "evaluation-inputs");
    await cp(evaluated, join(evaluationInputs, "fixture-run"), { recursive: true });
    await captureRun({ root, generatorRoot: checkout, committedRuns: evaluationInputs, out: evaluationProbe, id: "evaluation-probe", cohort: "development", protocol });
    const probes = [(await readRun(evaluationProbe)).manifest];
    expect(compareRuns({ baseline: plain, previous, candidate: plain }, { probes }).environmentDifferences)
      .toEqual([expect.objectContaining({ role: "previous", fidelityProbeRunId: "evaluation-probe" })]);
    expect(() => compareRuns({ baseline: plain, previous, candidate: plain }, { probes, strictEnvironment: true }))
      .toThrow("Evaluation runtime or dependency lock differs.");
  }, timeout);

  it.each(["baseline", "previous"] as const)("reports an incompatible %s evaluator before suggesting a fidelity probe", async role => {
    const candidate = await readRun(join(committed, "fixture-run"));
    const reference = structuredClone(candidate);
    reference.manifest.environment.node = "v0.0.0-elsewhere";
    reference.manifest.evaluatorDigest = reference.summary.evaluatorDigest = "different-evaluator";
    const runs = role === "baseline" ? { baseline: reference, candidate } : { baseline: candidate, previous: reference, candidate };
    expect(() => compareRuns(runs)).toThrow("evaluatorDigest differs. Run quality:pr or regenerate both revisions with the same harness and environment");
  }, timeout);

  it("removes the temporary worktree after baseline capture fails and preserves the error", async () => {
    const base = git(checkout, "rev-parse", "HEAD");
    let temporaryCheckout = "";
    const progress = () => {
      const block = git(root, "worktree", "list", "--porcelain").split("\n\n")
        .find(block => block.includes("unglish-quality-merge-base-") && block.includes(`\nHEAD ${base}\n`));
      expect(block).toBeDefined();
      temporaryCheckout = block!.split("\n")[0].slice("worktree ".length);
    };
    await expect(compareWithMergeBase({ root: checkout, base, out: join(directory, "failed-baseline"), cohort: "development", protocol: { ...protocol, wordsPerReplicate: 0 }, progress }))
      .rejects.toThrow("Invalid quality protocol version, ID, or sample size.");
    expect(temporaryCheckout).not.toBe("");
    expect(git(root, "worktree", "list", "--porcelain")).not.toContain(temporaryCheckout);
    await expect(stat(dirname(temporaryCheckout))).rejects.toMatchObject({ code: "ENOENT" });
  }, timeout);

  it("compares a branch with its merge base in one command and reports zero deltas without generator changes", async () => {
    // A branch of the clean fixture checkout that changes no generator source, independent of local edits to this tree.
    const base = git(checkout, "rev-parse", "HEAD");
    await writeFile(join(checkout, "README.md"), `${await readFile(join(checkout, "README.md"), "utf8")}\nBranch fixture.\n`);
    commitAll(checkout, "docs: branch fixture outside the generator");
    const head = git(checkout, "rev-parse", "HEAD");
    const out = join(directory, "pull-request");
    const scratchWorktrees = () => git(root, "worktree", "list", "--porcelain").split("\n").filter(line => line.includes("unglish-quality-merge-base-"));
    const before = scratchWorktrees();
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
    // Other checkouts of this repository may be running their own comparisons concurrently.
    expect(scratchWorktrees().filter(line => !before.includes(line))).toEqual([]);
    await expect(compareWithMergeBase({ root: checkout, base, out, cohort: "development", protocol })).rejects.toThrow();
  }, timeout);

  it("records uncommitted generator changes in both report formats", async () => {
    const entry = join(checkout, "src/index.ts");
    const original = await readFile(entry, "utf8");
    const out = join(directory, "dirty-comparison");
    try {
      await writeFile(entry, `${original}\n// Uncommitted generator fixture\n`);
      const report = await compareWithMergeBase({ root: checkout, base: "HEAD", out, cohort: "development", protocol });
      const baseline = await readRun(join(out, "baseline"));
      const candidate = await readRun(join(out, "candidate"));
      expect(report.generatorProvenance).toEqual([
        { role: "baseline", runId: baseline.manifest.id, commit: baseline.manifest.generator.commit, dirty: false, sourceDigest: baseline.manifest.generator.sourceDigest },
        { role: "candidate", runId: candidate.manifest.id, commit: candidate.manifest.generator.commit, dirty: true, sourceDigest: candidate.manifest.generator.sourceDigest },
      ]);
      expect(candidate.manifest.generator.sourceDigest).not.toBe(baseline.manifest.generator.sourceDigest);
      expect(JSON.parse(await readFile(join(out, "comparison.json"), "utf8")).generatorProvenance).toEqual(report.generatorProvenance);
      const markdown = await readFile(join(out, "comparison.md"), "utf8");
      expect(markdown).toContain(`| candidate | ${candidate.manifest.id} | ${candidate.manifest.generator.commit} | dirty (uncommitted generator changes) | ${candidate.manifest.generator.sourceDigest} |`);
      const withPrevious = compareRuns({ baseline, candidate, previous: baseline });
      expect(withPrevious.generatorProvenance).toContainEqual(expect.objectContaining({ role: "previous", runId: baseline.manifest.id, dirty: false }));
    } finally {
      await writeFile(entry, original);
    }
  }, timeout);
});
