import { mkdir, open, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import type { ComparisonPlan } from "../comparison/comparison-model.js";
import type { Snapshot } from "../model.js";
import { allocateReadAloud, readAloudPacket } from "./allocation.js";
import { freezeAdjudication } from "./coding.js";
import { freezeReadAloud } from "./freeze.js";
import { loadAlternativeEvidence, loadCodingFiles, loadLocalFiles, loadReadingMaterials } from "./material-files.js";
import type { CodingInputFiles, ReadingInputFile } from "./material-files.js";
import type { ReadAloudComparison, ReadAloudExport, ReadAloudRegistration, ReadAloudRoster, Reading } from "./model.js";
import { blindCoderPacket, freezeReading, freezeReadAloudRoster, verifyReading } from "./readings.js";
import { reportReadAloud } from "./report.js";

const [command, ...args] = process.argv.slice(2);
const { values } = parseArgs({ args, options: Object.fromEntries([
  "registration", "baseline", "candidate", "comparison", "plan", "roster", "reading", "session", "input", "materials", "evidence", "out",
].map(key => [key, { type: "string" as const }])) });
function required(key: string): string {
  const value = values[key];
  if (typeof value !== "string" || !value) throw new Error(`--${key} is required.`);
  return value;
}
async function load<T>(file: string): Promise<T> {
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readFile(resolve(file)))) as T;
}
async function save(content: unknown): Promise<void> {
  await writeFile(resolve(required("out")), JSON.stringify(content, null, 2) + "\n", { flag: "wx", mode: 0o600 });
}
async function context(): Promise<{ comparison: ReadAloudComparison; plan: ComparisonPlan; roster: ReadAloudRoster }> {
  return { comparison: await load(required("comparison")), plan: await load(required("plan")), roster: await load(required("roster")) };
}
async function durableWrite(file: string, bytes: Uint8Array): Promise<void> {
  const handle = await open(file, "wx", 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
}
async function syncDirectory(directory: string): Promise<void> {
  const handle = await open(directory, "r");
  try { await handle.sync(); } finally { await handle.close(); }
}

try {
  if (command === "inventory") {
    const frozen = freezeReadAloud(await load<ReadAloudRegistration>(required("registration")), {
      baseline: await load<Snapshot>(required("baseline")), candidate: await load<Snapshot>(required("candidate")),
    });
    await save(frozen);
    console.log(`Retained ${frozen.draws.length} original source draws and ${frozen.draws.filter(draw => draw.intended.status === "unresolved").length} unresolved targets. No recordings or human evidence.`);
  } else if (command === "allocate") {
    await save(allocateReadAloud(await load<ReadAloudComparison>(required("comparison"))));
    console.log("Saved balanced spelling allocation bound to the frozen targets and alternatives.");
  } else if (command === "packet") {
    await save(readAloudPacket(await load<ReadAloudComparison>(required("comparison")), await load<ComparisonPlan>(required("plan")), required("session")));
    console.log("Saved spelling-only reader packet and registered instructions.");
  } else if (command === "roster") {
    const input = await load<{ verification_method: string; entries: ReadAloudRoster["entries"] }>(required("input"));
    await save(freezeReadAloudRoster(await load<ReadAloudComparison>(required("comparison")), input.verification_method, input.entries));
    console.log("Saved owner roster bindings; hashes do not prove independent people.");
  } else if (command === "recording") {
    const owner = await context(), source = await loadLocalFiles(required("input")), input = source.input as ReadingInputFile;
    const outcome = input.input.status === "recorded" ? { status: "recorded" as const, wav: await source.read(input.input.wav) } : input.input;
    await save(freezeReading(owner.comparison, owner.plan, owner.roster, input.identity, outcome));
    console.log("Saved assigned first-attempt recording/skip/failure receipt; actual first-attempt behavior still requires truthful collection.");
  } else if (command === "coder-packet") {
    const owner = await context(), reading = await load<Reading>(required("reading")), source = await loadLocalFiles(required("input"));
    const bytes = await source.read((source.input as { wav: string }).wav);
    const packet = blindCoderPacket(owner.comparison, owner.plan, owner.roster, reading, bytes);
    const directory = resolve(required("out"));
    await mkdir(directory, { mode: 0o700 });
    await syncDirectory(dirname(directory));
    await durableWrite(join(directory, `${packet.audio_sha256}.wav`), bytes);
    await durableWrite(join(directory, "packet.json"), Buffer.from(JSON.stringify(packet, null, 2) + "\n"));
    await syncDirectory(directory);
    await durableWrite(join(directory, "complete.json"), Buffer.from(JSON.stringify({ version: "read-aloud-coder-bundle-v1", reading_id: packet.reading_id, audio_sha256: packet.audio_sha256 }) + "\n"));
    await syncDirectory(directory);
    console.log("Saved private blind coder bundle with hash-only WAV filename. No spelling, source path, condition or reader identity.");
  } else if (command === "adjudicate") {
    const owner = await context(), reading = await load<Reading>(required("reading")), source = await loadLocalFiles(required("input"));
    const files = await loadCodingFiles(source.input as CodingInputFiles, source.read);
    verifyReading(owner.comparison, owner.plan, owner.roster, reading, files.wav);
    await save(freezeAdjudication(owner.comparison, reading, owner.roster, files.coders, files.decision));
    console.log("Sealed two original coder files and the independent blind decision; truthful independence still requires actual people.");
  } else if (command === "report" || command === "verify") {
    const evidence = typeof values.evidence === "string" ? await loadAlternativeEvidence(values.evidence) : [];
    const report = reportReadAloud(await load<ReadAloudExport>(required("input")), await loadReadingMaterials(required("materials")), evidence);
    if (command === "report") await save(report);
    console.log(`Authenticated ${report.trials.filter(trial => trial.reading_id !== null).length} trial receipts and original recording/annotation bytes. Descriptive conditional agreement only; no calibrated population interval or human-quality verdict.`);
  } else throw new Error("Use inventory, allocate, packet, roster, recording, coder-packet, adjudicate, report or verify.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Read-aloud command failed."); process.exitCode = 1;
}
