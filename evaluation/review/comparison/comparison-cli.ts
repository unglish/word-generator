import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { allocateComparison, reviewerPacket } from "./comparison-allocation.js";
import { freezeComparison } from "./comparison-freeze.js";
import { buildComparisonReport } from "./comparison-report.js";
import type { Snapshot } from "../model.js";
import type { ComparisonExport, ComparisonPlan, ComparisonRegistration, WrittenComparison } from "./comparison-model.js";

const [command, ...args] = process.argv.slice(2);
const { values } = parseArgs({ args, options: {
  registration: { type: "string" }, baseline: { type: "string" }, candidate: { type: "string" },
  input: { type: "string" }, plan: { type: "string" }, session: { type: "string" }, out: { type: "string" },
} });
function required(key: keyof typeof values): string {
  const value = values[key]; if (!value) throw new Error(`--${key} is required.`); return value;
}
async function load<T>(path: string): Promise<T> { return JSON.parse(await readFile(resolve(path), "utf8")); }
async function save(path: string, content: unknown, mode = 0o600): Promise<void> {
  await writeFile(path, JSON.stringify(content, null, 2) + "\n", { flag: "wx", mode });
}
try {
  if (command === "prepare") {
    const registration = await load<ComparisonRegistration>(required("registration"));
    const comparison = freezeComparison(registration, { baseline: await load<Snapshot>(required("baseline")), candidate: await load<Snapshot>(required("candidate")) });
    const plan = allocateComparison(comparison);
    const out = resolve(required("out")); await mkdir(out, { mode: 0o700 });
    await save(resolve(out, "comparison.json"), comparison); await save(resolve(out, "plan.json"), plan);
    console.log(`Prepared owner-only comparison ${comparison.digest}; ${plan.sessions.length} planned sessions. No observations collected.`);
  } else if (command === "packet") {
    const comparison = await load<WrittenComparison>(required("input")), plan = await load<ComparisonPlan>(required("plan"));
    const packet = reviewerPacket(comparison, plan, required("session"));
    await save(resolve(required("out")), packet, 0o644);
    console.log("Exported one blinded packet containing only the rubric, opaque IDs and spellings.");
  } else if (command === "report") {
    const report = buildComparisonReport(await load<ComparisonExport>(required("input")));
    await save(resolve(required("out")), report);
    console.log("Wrote descriptive condition/stratum/slot report; no population inference or identity verification.");
  } else throw new Error("Use prepare, packet, or report.");
} catch (error) { console.error(error instanceof Error ? error.message : "Comparison command failed."); process.exitCode = 1; }
