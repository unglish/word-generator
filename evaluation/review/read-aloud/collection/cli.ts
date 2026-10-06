import { mkdir, open, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { bytesHash } from "../../auditory/audio.js";
import type { ComparisonPlan } from "../../comparison/comparison-model.js";
import type { ReadAloudComparison, ReadAloudRoster } from "../model.js";
import { createReadAloudCollector } from "./core.js";
import { initializeReadAloudCollector, ReadAloudJournal, recoverReadAloudCollector } from "./journal.js";
import type { CaptureSource } from "./model.js";
import { createReadAloudServer } from "./server.js";
import { trackUnrequestedConnections } from "./shutdown.js";

const [command, ...args] = process.argv.slice(2);
const { values } = parseArgs({ args, options: Object.fromEntries([
  "comparison", "plan", "roster", "capture-source", "input", "out", "port", "lease-sha256", "journal-sha256",
].map(key => [key, { type: "string" as const }])) });
function required(key: string): string {
  const value = values[key]; if (typeof value !== "string" || !value) throw new Error(`--${key} is required.`); return value;
}
async function load<T>(file: string): Promise<T> { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readFile(resolve(file)))) as T; }
async function save(file: string, content: string | Uint8Array): Promise<void> {
  const handle = await open(file, "wx", 0o600); try { await handle.writeFile(content); await handle.sync(); } finally { await handle.close(); }
}
async function syncDirectory(directory: string): Promise<void> {
  const handle = await open(directory, "r"); try { await handle.sync(); } finally { await handle.close(); }
}
async function saveJson(file: string, value: unknown): Promise<void> { await save(file, JSON.stringify(value) + "\n"); }
try {
  if (command === "initialize") {
    const comparison = await load<ReadAloudComparison>(required("comparison")), plan = await load<ComparisonPlan>(required("plan")), roster = await load<ReadAloudRoster>(required("roster"));
    const { manifest, credentials } = createReadAloudCollector(comparison, plan, roster, (values["capture-source"] ?? "microphone") as CaptureSource);
    await initializeReadAloudCollector(resolve(required("out")), manifest, credentials);
    console.log(`Created private collector ${manifest.digest}; credentials are in credentials.json. Capture source: ${manifest.capture_source}. No readings collected.`);
  } else if (command === "serve") {
    const port = Number(values.port ?? "4190");
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("--port must be an integer from 0 to 65535.");
    const journal = await ReadAloudJournal.openWriter(resolve(required("input"))), server = createReadAloudServer(journal);
    const closeUnrequested = trackUnrequestedConnections(server);
    try { await new Promise<void>((accept, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", accept); }); }
    catch (error) { await journal.close(); throw error; }
    const address = server.address(); if (!address || typeof address === "string") throw new Error("No loopback address.");
    console.log(`Read-aloud collector ready at http://127.0.0.1:${address.port}/. Open a reader link with its private token as the URL fragment. Credentials remain private.`);
    const shutdown = () => {
      server.close(() => { void journal.close().catch(error => { console.error(error); process.exitCode = 1; }); });
      closeUnrequested();
    };
    process.once("SIGINT", shutdown); process.once("SIGTERM", shutdown);
  } else if (command === "export") {
    const input = resolve(required("input")), journal = await ReadAloudJournal.load(input), state = journal.snapshot(), out = resolve(required("out"));
    await mkdir(out, { mode: 0o700 }); await syncDirectory(dirname(out)); await mkdir(resolve(out, "recordings"), { mode: 0o700 });
    const materials: { reading_id: string; wav: string }[] = [], copied = new Set<string>();
    for (const reading of state.data.readings) {
      if (reading.outcome.status !== "recorded") continue;
      const hash = reading.outcome.audio.sha256, relative = `recordings/${hash}.wav`, bytes = await readFile(resolve(input, relative));
      if (bytesHash(bytes) !== hash) throw new Error("Recording changed during export; preserve this incomplete directory.");
      if (!copied.has(hash)) { await save(resolve(out, relative), bytes); copied.add(hash); }
      materials.push({ reading_id: reading.id, wav: relative });
    }
    await saveJson(resolve(out, "export.json"), state.data); await saveJson(resolve(out, "audit.json"), { manifest: state.manifest, events: state.events });
    await saveJson(resolve(out, "materials.json"), materials); await saveJson(resolve(out, "material-inventory.json"), await journal.materialInventory());
    await syncDirectory(resolve(out, "recordings")); await syncDirectory(out);
    await saveJson(resolve(out, "complete.json"), { version: "read-aloud-analysis-export-v1", manifest_digest: state.manifest.digest,
      readings: state.data.readings.length, receipts: state.events.length, distinct_recordings: copied.size }); await syncDirectory(out);
    console.log(`Exported ${state.data.readings.length} readings, ${state.events.length} receipts and ${copied.size} WAVs. No coding decisions or human-quality verdict added.`);
  } else if (command === "recover") {
    const result = await recoverReadAloudCollector(resolve(required("input")), required("lease-sha256"), required("journal-sha256"));
    console.log(`Retained ${result.report.retained_readings} readings and ${result.report.retained_events} complete receipts. Original lease and journal preserved in ${result.backup}. Interrupted tail bytes: ${result.report.interrupted_tail_bytes}.`);
  } else throw new Error("Use initialize, serve, export or recover.");
} catch (error) { console.error(error instanceof Error ? error.message : "Read-aloud collection failed."); process.exitCode = 1; }
