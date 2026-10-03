import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import type { ComparisonPlan } from "../../comparison/comparison-model.js";
import { loadMaterialFiles } from "../material-files.js";
import type { AuditoryComparison, AuditoryRelease } from "../model.js";
import { createAuditoryCollector } from "./core.js";
import { AuditoryJournal, initializeAuditoryCollector, recoverAuditoryCollector } from "./journal.js";
import type { AuditoryEnrollment } from "./model.js";
import { createAuditoryServer } from "./server.js";

const [command, ...args] = process.argv.slice(2);
const { values } = parseArgs({ args, options: Object.fromEntries([
  "comparison", "release", "plan", "roster", "materials", "input", "out", "port", "lease-sha256", "journal-sha256",
].map(key => [key, { type: "string" as const }])) });
function required(key: string): string { const value = values[key]; if (typeof value !== "string" || !value) throw new Error(`--${key} is required.`); return value; }
async function load<T>(file: string): Promise<T> { return JSON.parse(await readFile(resolve(file), "utf8")); }
async function save(file: string, value: unknown): Promise<void> { await writeFile(file, JSON.stringify(value) + "\n", { flag: "wx", mode: 0o600 }); }
try {
  if (command === "initialize") {
    const comparison = await load<AuditoryComparison>(required("comparison")), release = await load<AuditoryRelease>(required("release")), plan = await load<ComparisonPlan>(required("plan"));
    const roster = typeof values.roster === "string" ? await load<AuditoryEnrollment>(values.roster) : null;
    const { manifest, credentials } = createAuditoryCollector(comparison, release, plan, roster);
    await initializeAuditoryCollector(resolve(required("out")), manifest, credentials, await loadMaterialFiles(required("materials")));
    console.log(`Created private auditory collector ${manifest.digest}; credentials are in credentials.json. No listener observations collected.`);
  } else if (command === "serve") {
    const port = Number(values.port ?? "4180");
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("--port must be an integer from 0 to 65535.");
    const journal = await AuditoryJournal.openWriter(resolve(required("input"))), server = createAuditoryServer(journal);
    try { await new Promise<void>((accept, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", accept); }); }
    catch (error) { await journal.close(); throw error; }
    const address = server.address(); if (!address || typeof address === "string") throw new Error("No auditory loopback address.");
    console.log(`Auditory collector ready at http://127.0.0.1:${address.port}/. Use a participant token as the URL fragment; owner credentials remain private.`);
    const shutdown = () => server.close(() => { void journal.close().catch(error => { console.error(error); process.exitCode = 1; }); });
    process.once("SIGINT", shutdown); process.once("SIGTERM", shutdown);
  } else if (command === "export") {
    const state = (await AuditoryJournal.load(resolve(required("input")))).snapshot(), out = resolve(required("out"));
    await mkdir(out, { mode: 0o700 }); await save(resolve(out, "export.json"), state.data);
    await save(resolve(out, "audit.json"), { manifest: state.manifest, events: state.events });
    if (state.manifest.roster) await save(resolve(out, "roster.json"), state.manifest.roster);
    console.log(`Exported ${state.data.responses.length} responses and ${state.events.length} delivery/playback/answer receipts. Purpose: ${state.manifest.comparison.registration.purpose}. Recorded events are not proof of attention or actual-human quality.`);
  } else if (command === "recover") {
    const recovered = await recoverAuditoryCollector(resolve(required("input")), required("lease-sha256"), required("journal-sha256"));
    console.log(`Retained ${recovered.report.retained_events} complete receipts and the entire original journal/lease in ${recovered.backup}. Interrupted tail bytes: ${recovered.report.interrupted_tail_bytes}.`);
  } else throw new Error("Use initialize, serve, export or recover.");
} catch (error) { console.error(error instanceof Error ? error.message : "Auditory collection failed."); process.exitCode = 1; }
