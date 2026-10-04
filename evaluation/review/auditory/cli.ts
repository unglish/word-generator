import { inferAuditory } from "./inference.js";
import { freezeAuditoryRoster } from "./inference-protocol.js";
import type { AuditoryRoster } from "./inference-model.js";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import type { ComparisonPlan } from "../comparison/comparison-model.js";
import type { Snapshot } from "../model.js";
import { allocateAuditory, auditoryPacket } from "./allocation.js";
import { freezeRelease, verifyReleaseFiles } from "./audio.js";
import { freezeAuditory } from "./freeze.js";
import type { AuditoryComparison, AuditoryExport, AuditoryRegistration, AuditoryRelease } from "./model.js";
import { buildAuditoryReport } from "./report.js";
import { loadMaterialFiles } from "./material-files.js";

const [command, ...args] = process.argv.slice(2);
const { values } = parseArgs({ args, options: Object.fromEntries([
  "registration", "baseline", "candidate", "comparison", "input", "release", "plan", "session", "out", "materials", "roster",
].map(key => [key, { type: "string" as const }])) });
function required(key: string): string {
  const value = values[key]; if (typeof value !== "string" || !value) throw new Error(`--${key} is required.`); return value;
}
async function load<T>(file: string): Promise<T> { return JSON.parse(await readFile(resolve(file), "utf8")); }
async function save(content: unknown): Promise<void> {
  await writeFile(resolve(required("out")), JSON.stringify(content, null, 2) + "\n", { flag: "wx", mode: 0o600 });
}

try {
  if (command === "inventory") {
    const comparison = freezeAuditory(await load<AuditoryRegistration>(required("registration")), {
      baseline: await load<Snapshot>(required("baseline")), candidate: await load<Snapshot>(required("candidate")),
    });
    await save(comparison);
    console.log(`Retained ${comparison.draws.length} source draws, including ${comparison.draws.filter(draw => draw.assessment.status === "unresolved").length} unresolved targets. No release or observations.`);
  } else if (command === "release" || command === "verify") {
    const comparison = await load<AuditoryComparison>(required("comparison")), files = await loadMaterialFiles(required("input"));
    if (command === "release") { await save(freezeRelease(comparison, files)); console.log("Frozen all audio and attestation bindings. Recorded attestations still require truthful independent people."); }
    else { verifyReleaseFiles(comparison, await load<AuditoryRelease>(required("release")), files); console.log("All frozen audio, production and transcription files reauthenticated."); }
  } else if (command === "allocate") {
    await save(allocateAuditory(await load<AuditoryComparison>(required("comparison"))));
    console.log("Saved balanced auditory target allocation; no people enrolled or responses collected.");
  } else if (command === "packet") {
    await save(auditoryPacket(await load<AuditoryComparison>(required("comparison")), await load<AuditoryRelease>(required("release")),
      await load<ComparisonPlan>(required("plan")), required("session")));
    console.log("Saved audio-only packet: opaque IDs, audio hashes and auditory rubric.");
  } else if (command === "roster") {
    const comparison = await load<AuditoryComparison>(required("comparison"));
    const input = await load<Pick<AuditoryRoster, "verification_method" | "entries">>(required("input"));
    await save(freezeAuditoryRoster(comparison, input.verification_method, input.entries));
    console.log("Saved owner-attested listener roster; records do not establish verified people.");
  } else if (command === "infer") {
    const data = await load<AuditoryExport>(required("input")), files = await loadMaterialFiles(required("materials"));
    const roster = typeof values.roster === "string" ? await load<AuditoryRoster>(values.roster) : undefined;
    await save(inferAuditory(data, files, roster));
    console.log("Saved uncalibrated auditory stability analysis; population intervals remain unavailable.");
  } else if (command === "report") {
    await save(buildAuditoryReport(await load<AuditoryExport>(required("input"))));
    console.log("Saved descriptive auditory report. No calibrated population inference or human-quality verdict.");
  } else throw new Error("Use inventory, release, verify, allocate, packet, roster, report or infer.");
} catch (error) { console.error(error instanceof Error ? error.message : "Auditory command failed."); process.exitCode = 1; }
