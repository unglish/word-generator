import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { createCollector } from "./collection-core.js";
import { CollectorJournal, initializeCollector } from "./collection-journal.js";
import { createCollectorServer } from "./collection-server.js";
import type { ComparisonPlan, WrittenComparison } from "../comparison-model.js";
import type { EnrollmentRoster } from "../inference-model.js";

const [command, ...args] = process.argv.slice(2);
const { values } = parseArgs({ args, options: {
  input: { type: "string" }, plan: { type: "string" }, roster: { type: "string" }, out: { type: "string" }, port: { type: "string" },
} });
function required(key: keyof typeof values): string { const value = values[key]; if (!value) throw new Error(`--${key} is required.`); return value; }
async function load<T>(path: string): Promise<T> { return JSON.parse(await readFile(resolve(path), "utf8")); }
async function save(path: string, value: unknown): Promise<void> { await writeFile(path, JSON.stringify(value) + "\n", { flag: "wx", mode: 0o600 }); }
try {
  if (command === "initialize") {
    const comparison = await load<WrittenComparison>(required("input")), plan = await load<ComparisonPlan>(required("plan"));
    const roster = values.roster ? await load<EnrollmentRoster>(values.roster) : null;
    const { manifest, credentials } = createCollector(comparison, plan, roster);
    await initializeCollector(resolve(required("out")), manifest, credentials);
    console.log(`Created private collection ${manifest.digest}; participant/owner credentials are in credentials.json. No responses collected.`);
  } else if (command === "serve") {
    const port = Number(values.port ?? "4179");
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("--port must be an integer from 0 to 65535.");
    const journal = await CollectorJournal.openWriter(resolve(required("input")));
    const server = createCollectorServer(journal);
    try {
      await new Promise<void>((accept, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", () => accept()); });
    } catch (error) { await journal.close(); throw error; }
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Collector did not obtain a loopback address.");
    console.log(`Collector ready at http://127.0.0.1:${address.port}/. Use the participant token as the URL fragment; owner credentials remain private.`);
    const shutdown = () => server.close(() => { void journal.close().catch(error => { console.error(error); process.exitCode = 1; }); });
    process.once("SIGINT", shutdown); process.once("SIGTERM", shutdown);
  } else if (command === "export") {
    const journal = await CollectorJournal.load(resolve(required("input"))), state = journal.snapshot();
    const out = resolve(required("out")); await mkdir(out, { mode: 0o700 });
    await save(resolve(out, "export.json"), state.data);
    await save(resolve(out, "audit.json"), { manifest: state.manifest, events: state.events });
    if (state.manifest.roster) await save(resolve(out, "roster.json"), state.manifest.roster);
    console.log(`Exported ${state.data.responses.length} recorded responses with frozen source/plan and receipt chain. Purpose: ${state.manifest.comparison.registration.purpose}.`);
  } else throw new Error("Use initialize, serve, or export.");
} catch (error) { console.error(error instanceof Error ? error.message : "Collection command failed."); process.exitCode = 1; }
