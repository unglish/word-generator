import { readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import type { ComparisonPlan } from "../comparison/comparison-model.js";
import type { Snapshot } from "../model.js";
import { allocateAuditory, auditoryPacket } from "./allocation.js";
import { freezeRelease, verifyReleaseFiles } from "./audio.js";
import type { AssetMaterial } from "./audio.js";
import { freezeAuditory } from "./freeze.js";
import type { AudioVerification, AuditoryComparison, AuditoryExport, AuditoryRegistration, AuditoryRelease } from "./model.js";
import { buildAuditoryReport } from "./report.js";

interface MaterialFile {
  target_digest: string;
  wav: string;
  production_record: string;
  verification: { record: AudioVerification; transcription_file: string }[];
}
const [command, ...args] = process.argv.slice(2);
const { values } = parseArgs({ args, options: Object.fromEntries([
  "registration", "baseline", "candidate", "comparison", "input", "release", "plan", "session", "out",
].map(key => [key, { type: "string" as const }])) });
function required(key: string): string {
  const value = values[key]; if (typeof value !== "string" || !value) throw new Error(`--${key} is required.`); return value;
}
async function load<T>(file: string): Promise<T> { return JSON.parse(await readFile(resolve(file), "utf8")); }
async function save(content: unknown): Promise<void> {
  await writeFile(resolve(required("out")), JSON.stringify(content, null, 2) + "\n", { flag: "wx", mode: 0o600 });
}
async function materialFiles(manifest: string): Promise<AssetMaterial[]> {
  const directory = dirname(resolve(manifest)), files = await load<MaterialFile[]>(manifest);
  function localPath(file: string): string {
    if (typeof file !== "string" || !file || isAbsolute(file)) throw new Error("Material paths must be relative to their manifest directory.");
    const target = resolve(directory, file), part = relative(directory, target);
    if (part === ".." || part.startsWith("../") || isAbsolute(part)) throw new Error("Material path escapes its manifest directory.");
    return target;
  }
  const materials: AssetMaterial[] = [];
  for (const file of files) {
    const verification: AssetMaterial["verification"] = [];
    for (const entry of file.verification) verification.push({ record: entry.record, transcription_file: await readFile(localPath(entry.transcription_file)) });
    materials.push({ target_digest: file.target_digest, wav: await readFile(localPath(file.wav)), production_record: await readFile(localPath(file.production_record)), verification });
  }
  return materials;
}

try {
  if (command === "inventory") {
    const comparison = freezeAuditory(await load<AuditoryRegistration>(required("registration")), {
      baseline: await load<Snapshot>(required("baseline")), candidate: await load<Snapshot>(required("candidate")),
    });
    await save(comparison);
    console.log(`Retained ${comparison.draws.length} source draws, including ${comparison.draws.filter(draw => draw.assessment.status === "unresolved").length} unresolved targets. No release or observations.`);
  } else if (command === "release" || command === "verify") {
    const comparison = await load<AuditoryComparison>(required("comparison")), files = await materialFiles(required("input"));
    if (command === "release") { await save(freezeRelease(comparison, files)); console.log("Frozen all audio and attestation bindings. Recorded attestations still require truthful independent people."); }
    else { verifyReleaseFiles(comparison, await load<AuditoryRelease>(required("release")), files); console.log("All frozen audio, production and transcription files reauthenticated."); }
  } else if (command === "allocate") {
    await save(allocateAuditory(await load<AuditoryComparison>(required("comparison"))));
    console.log("Saved balanced auditory target allocation; no people enrolled or responses collected.");
  } else if (command === "packet") {
    await save(auditoryPacket(await load<AuditoryComparison>(required("comparison")), await load<AuditoryRelease>(required("release")),
      await load<ComparisonPlan>(required("plan")), required("session")));
    console.log("Saved audio-only packet: opaque IDs, audio hashes and auditory rubric.");
  } else if (command === "report") {
    await save(buildAuditoryReport(await load<AuditoryExport>(required("input"))));
    console.log("Saved descriptive auditory report. No calibrated population inference or human-quality verdict.");
  } else throw new Error("Use inventory, release, verify, allocate, packet or report.");
} catch (error) { console.error(error instanceof Error ? error.message : "Auditory command failed."); process.exitCode = 1; }
