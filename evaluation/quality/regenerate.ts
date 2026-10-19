import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { captureRun, readRun } from "./capture.js";
import { compareRuns, comparisonMarkdown } from "./compare.js";
import type { ComparisonReport } from "./compare.js";
import type { Cohort, Protocol } from "./model.js";

/** Write both report formats into an existing directory without replacing earlier reports. */
export async function writeComparison(directory: string, report: ComparisonReport): Promise<void> {
  await writeFile(join(directory, "comparison.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  await writeFile(join(directory, "comparison.md"), comparisonMarkdown(report), { flag: "wx" });
}

export interface MergeBaseComparisonOptions {
  /** Harness checkout; its working tree is the candidate. */
  root: string;
  /** Ref whose merge base with HEAD supplies the baseline generator. */
  base: string;
  out: string;
  cohort: Cohort;
  protocol: Protocol;
  progress?: (message: string) => void;
}

/**
 * Capture the merge base's generator and the current checkout with one harness, in one
 * environment, then compare them. Writes `baseline/`, `candidate/`, and the reports to `out`.
 */
export async function compareWithMergeBase(options: MergeBaseComparisonOptions): Promise<ComparisonReport> {
  const { root, base, out, cohort, protocol, progress } = options;
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const mergeBase = git("merge-base", "HEAD", base);
  const head = git("rev-parse", "HEAD");
  await mkdir(dirname(out), { recursive: true });
  await mkdir(out); // Existing comparisons are never replaced.
  const scratch = await mkdtemp(join(tmpdir(), "unglish-quality-merge-base-"));
  const checkout = join(scratch, "checkout");
  // Clean up in every case, reporting the first failure: a capture error is never replaced by a cleanup error.
  const failures: unknown[] = [];
  try {
    git("worktree", "add", "--detach", checkout, mergeBase);
    progress?.(`Capturing merge base ${mergeBase} from a temporary worktree`);
    await captureRun({ root, generatorRoot: checkout, out: join(out, "baseline"), id: `merge-base-${mergeBase.slice(0, 12)}`, cohort, protocol, progress });
  } catch (error) {
    failures.push(error);
  }
  try {
    git("worktree", "remove", "--force", checkout);
  } catch (error) {
    failures.push(error);
  }
  await rm(scratch, { recursive: true, force: true });
  if (failures.length) throw failures[0];
  progress?.(`Capturing candidate ${head} from ${root}`);
  await captureRun({ root, out: join(out, "candidate"), id: `candidate-${head.slice(0, 12)}`, cohort, protocol, progress });
  const report = compareRuns({ baseline: await readRun(join(out, "baseline")), candidate: await readRun(join(out, "candidate")) });
  await writeComparison(out, report);
  return report;
}
