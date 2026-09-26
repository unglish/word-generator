import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { CMU_COMPATIBILITY_DEFINITION, CMU_PARSER_VERSION, parseCmuRecords, selectCompatibleCmu } from "./cmu.js";
import { CMU_REVISION, CMU_SHA256 } from "../review/wordlikeness/model.js";

const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const { values } = parseArgs({ options: { source: { type: "string" }, out: { type: "string" } } });
if (!values.source || !values.out) throw new Error("Use --source PINNED_CMU --out NEW_AUDIT.json");
const bytes = await readFile(resolve(values.source));
if (sha256(bytes) !== CMU_SHA256) throw new Error("Raw source checksum does not match the pinned CMU dictionary.");
const sources = await Promise.all(["evaluation/corpus/cmu.ts", "evaluation/corpus/audit.ts", "evaluation/review/wordlikeness/model.ts"].map(async path => ({
  path, content: await readFile(resolve(root, path), "utf8"),
})));
const records = parseCmuRecords(bytes.toString("utf8"));
if (records.map(record => record.raw + record.ending).join("") !== bytes.toString("utf8")) throw new Error("Source round trip failed.");
const selected = selectCompatibleCmu(records);
const entries = selected.entries.map(({ line, label, spelling, tokens }) => ({ line, label, spelling, tokens }));
const counts = { entry: 0, comment: 0, blank: 0 };
for (const record of records) counts[record.kind]++;
if (selected.entries.length + selected.rejections.length !== counts.entry) throw new Error("Record accounting mismatch.");
const licensePath = "evaluation/review/wordlikeness/artifacts/CMUDICT-LICENSE.txt";
const license = await readFile(resolve(root, licensePath));
const report = {
  version: "cmu-source-audit-v1",
  source: { revision: CMU_REVISION, file: "cmudict.dict", sha256: CMU_SHA256, bytes: bytes.length,
    license: { path: licensePath, sha256: sha256(license) } },
  parser: { version: CMU_PARSER_VERSION, implementationSha256: sha256(JSON.stringify(sources)), sources },
  population: { policy: selected.policy, definition: CMU_COMPATIBILITY_DEFINITION,
    policyDigest: sha256(JSON.stringify(CMU_COMPATIBILITY_DEFINITION)), units: "integer-selected-entry-count",
    entryDigest: sha256(JSON.stringify(entries)), accepted: entries.length, excluded: selected.excluded },
  records: counts,
  rejections: selected.rejections,
};
for (const source of sources) {
  if (await readFile(resolve(root, source.path), "utf8") !== source.content) throw new Error("Audit source changed during analysis.");
}
await writeFile(resolve(values.out), JSON.stringify(report) + "\n", { flag: "wx" });
console.log(JSON.stringify({ records: counts, accepted: entries.length, excluded: selected.excluded, entryDigest: report.population.entryDigest }));
