import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { captureRun, readRun, rescoreRun } from "./capture.js";
import { compareRuns } from "./compare.js";
import type { Cohort, Protocol } from "./model.js";
import { compareWithMergeBase, writeComparison } from "./regenerate.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const [command, ...args] = process.argv.slice(2);
const { values, tokens } = parseArgs({ args, tokens: true, options: {
  id: { type: "string" }, out: { type: "string" }, run: { type: "string" },
  baseline: { type: "string" }, candidate: { type: "string" }, previous: { type: "string" },
  cohort: { type: "string", default: "development" }, protocol: { type: "string" },
  "generator-root": { type: "string" }, base: { type: "string", default: "origin/main" },
  probe: { type: "string", multiple: true }, "strict-environment": { type: "boolean", default: false },
} });

const COMMAND_OPTIONS: Record<string, readonly string[]> = {
  capture: ["id", "out", "cohort", "protocol", "generator-root"],
  rescore: ["run", "id", "out"],
  verify: ["run"],
  compare: ["baseline", "candidate", "previous", "out", "probe", "strict-environment"],
  pr: ["base", "out", "cohort", "protocol"],
};

/** Refuse options a command would otherwise silently ignore, such as `pr --generator-root`. */
function rejectUnusedOptions(): void {
  const allowed = COMMAND_OPTIONS[command ?? ""];
  if (!allowed) return;
  const unused = tokens.find(token => token.kind === "option" && !allowed.includes(token.name));
  if (unused?.kind === "option") throw new Error(`--${unused.name} does not apply to ${command}.`);
}

function required(key: "id" | "out" | "run" | "baseline" | "candidate"): string {
  const value = values[key];
  if (!value) throw new Error(`--${key} is required.`);
  return value;
}

function cohort(): Cohort {
  if (values.cohort !== "development" && values.cohort !== "validation") throw new Error("--cohort must be development or validation.");
  return values.cohort;
}

async function protocol(): Promise<Protocol> {
  const path = resolve(values.protocol ?? resolve(root, "evaluation/quality/protocol.json"));
  return JSON.parse(await readFile(path, "utf8")) as Protocol;
}

const words = (summary: { profiles: Array<{ words: number }> }): string =>
  summary.profiles.reduce((total, profile) => total + profile.words, 0).toLocaleString();

try {
  rejectUnusedOptions();
  if (command === "capture") {
    const out = resolve(required("out"));
    const generatorRoot = values["generator-root"] ? resolve(values["generator-root"]) : undefined;
    const summary = await captureRun({ root, generatorRoot, out, id: required("id"), cohort: cohort(), protocol: await protocol(), progress: console.log });
    console.log(`Captured ${words(summary)} traced outputs: ${out}`);
  } else if (command === "rescore") {
    const out = resolve(required("out"));
    const summary = await rescoreRun({ root, input: resolve(required("run")), out, id: required("id"), progress: console.log });
    console.log(`Rescored ${words(summary)} archived outputs without generation: ${out}`);
  } else if (command === "verify") {
    const run = await readRun(resolve(required("run")), true);
    console.log(`Verified every archived artifact for ${run.manifest.id}.`);
  } else if (command === "compare") {
    const baseline = await readRun(resolve(required("baseline")));
    const candidate = await readRun(resolve(required("candidate")));
    const previous = values.previous ? await readRun(resolve(values.previous)) : undefined;
    const probes = await Promise.all((values.probe ?? []).map(async path => (await readRun(resolve(path))).manifest));
    const report = compareRuns({ baseline, candidate, previous }, { probes, strictEnvironment: values["strict-environment"] });
    const out = resolve(required("out"));
    await mkdir(dirname(out), { recursive: true });
    await mkdir(out);
    await writeComparison(out, report);
    console.log(`Compared verified summaries: ${out}`);
  } else if (command === "pr") {
    const out = resolve(values.out ?? resolve(root, "memory/quality-pr", new Date().toISOString().replace(/[:.]/g, "-")));
    await compareWithMergeBase({ root, base: values.base, out, cohort: cohort(), protocol: await protocol(), progress: console.log });
    console.log(`Compared the merge base with ${values.base} against the current checkout: ${resolve(out, "comparison.md")}`);
  } else {
    throw new Error("Use capture, rescore, verify, compare, or pr. See docs/quality-baselines.md for arguments.");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Quality benchmark failed.");
  process.exitCode = 1;
}
