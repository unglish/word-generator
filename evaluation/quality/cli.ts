import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { captureRun, readRun, rescoreRun } from "./capture.js";
import { compareSummaries, comparisonMarkdown } from "./compare.js";
import type { Protocol } from "./model.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const [command, ...args] = process.argv.slice(2);
const { values } = parseArgs({ args, options: {
  id: { type: "string" }, out: { type: "string" }, run: { type: "string" },
  baseline: { type: "string" }, candidate: { type: "string" }, previous: { type: "string" },
  cohort: { type: "string", default: "development" }, protocol: { type: "string" },
} });

function required(key: keyof typeof values): string {
  const value = values[key];
  if (!value) throw new Error(`--${key} is required.`);
  return value;
}

try {
  if (command === "capture") {
    const cohort = values.cohort;
    if (cohort !== "development" && cohort !== "validation") throw new Error("--cohort must be development or validation.");
    const protocolPath = resolve(values.protocol ?? resolve(root, "evaluation/quality/protocol.json"));
    const protocol = JSON.parse(await readFile(protocolPath, "utf8")) as Protocol;
    const out = resolve(required("out"));
    const summary = await captureRun({ root, out, id: required("id"), cohort, protocol, progress: console.log });
    console.log(`Captured ${summary.profiles.reduce((total, profile) => total + profile.words, 0).toLocaleString()} traced outputs: ${out}`);
  } else if (command === "rescore") {
    const out = resolve(required("out"));
    const summary = await rescoreRun({ root, input: resolve(required("run")), out, id: required("id"), progress: console.log });
    console.log(`Rescored ${summary.profiles.reduce((total, profile) => total + profile.words, 0).toLocaleString()} archived outputs without generation: ${out}`);
  } else if (command === "verify") {
    const run = await readRun(resolve(required("run")), true);
    console.log(`Verified every archived artifact for ${run.manifest.id}.`);
  } else if (command === "compare") {
    const baseline = await readRun(resolve(required("baseline")));
    const candidate = await readRun(resolve(required("candidate")));
    const previous = values.previous ? await readRun(resolve(values.previous)) : undefined;
    for (const run of previous ? [baseline, previous] : [baseline]) {
      if (run.manifest.environment.node !== candidate.manifest.environment.node || run.manifest.environment.packageLockDigest !== candidate.manifest.environment.packageLockDigest) {
        throw new Error("Runtime or dependency lock differs. Reproduce under the same environment before comparing.");
      }
      const referenceEnvironment = run.manifest.evaluationEnvironment ?? run.manifest.environment;
      const candidateEnvironment = candidate.manifest.evaluationEnvironment ?? candidate.manifest.environment;
      if (referenceEnvironment.node !== candidateEnvironment.node || referenceEnvironment.packageLockDigest !== candidateEnvironment.packageLockDigest) {
        throw new Error("Evaluation runtime or dependency lock differs. Rescore both archives under the same environment before comparing.");
      }
    }
    const report = compareSummaries(baseline.summary, candidate.summary, previous?.summary);
    const out = resolve(required("out"));
    await mkdir(dirname(out), { recursive: true });
    await mkdir(out);
    await writeFile(resolve(out, "comparison.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
    await writeFile(resolve(out, "comparison.md"), comparisonMarkdown(report), { flag: "wx" });
    console.log(`Compared verified summaries: ${out}`);
  } else {
    throw new Error("Use capture, rescore, verify, or compare. See docs/quality-baselines.md for arguments.");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Quality benchmark failed.");
  process.exitCode = 1;
}
