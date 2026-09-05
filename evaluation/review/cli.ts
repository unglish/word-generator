import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { freezeStudy, validateSnapshot } from "./snapshot.js";
import { OwnerApi } from "./owner-api.js";
import { buildReport, reportMarkdown, responseCsv } from "./report.js";
import type { ReviewExport, Snapshot } from "./model.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const [command, ...args] = process.argv.slice(2);
const { values } = parseArgs({ args, options: {
  study: { type: "string" }, seed: { type: "string", default: "20260904" }, count: { type: "string", default: "200" },
  file: { type: "string" }, input: { type: "string" }, out: { type: "string" },
} });
const required = (key: keyof typeof values) => { const value = values[key]; if (!value) throw new Error(`--${key} is required.`); return value; };
const owner = () => new OwnerApi(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SECRET_KEY ?? "");
const load = async <T>(path: string): Promise<T> => JSON.parse(await readFile(resolve(path), "utf8"));

try {
  if (command === "freeze") {
    const id = required("study");
    const snapshot = await freezeStudy(root, id, Number(values.seed), Number(values.count));
    const path = resolve(root, "evaluation/review/studies", `${id}.json`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(snapshot)}\n`, { flag: "wx" });
    console.log(`Frozen ${snapshot.samples.length} draws: ${path}\nDigest: ${snapshot.digest}`);
  } else if (command === "import") {
    const snapshot = await load<Snapshot>(required("file"));
    validateSnapshot(snapshot);
    await owner().importStudy(snapshot);
    console.log(`Verified and opened study ${snapshot.manifest.study_id}.`);
  } else if (command === "export") {
    const data = await owner().exportStudy(required("study"));
    const out = resolve(required("out"));
    await mkdir(out, { recursive: true });
    await writeFile(resolve(out, "export.json"), `${JSON.stringify(data)}\n`, { flag: "wx" });
    await writeFile(resolve(out, "responses.csv"), responseCsv(data), { flag: "wx" });
    console.log(`Exported ${data.responses.length} responses to ${out}.`);
  } else if (command === "report") {
    const data = await load<ReviewExport>(required("input"));
    const report = buildReport(data);
    const out = resolve(required("out"));
    await mkdir(out, { recursive: true });
    await writeFile(resolve(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
    await writeFile(resolve(out, "report.md"), reportMarkdown(report), { flag: "wx" });
    console.log(`Wrote report to ${out}.`);
  } else throw new Error("Use freeze, import, export, or report.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Review command failed.");
  process.exitCode = 1;
}
