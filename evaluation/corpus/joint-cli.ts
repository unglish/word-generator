import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { writeJointArtifact } from "./joint-artifact.js";

const { values } = parseArgs({ options: { source: { type: "string" }, out: { type: "string" } } });
if (!values.source || !values.out) throw new Error("Use --source PINNED_CMU --out NEW_REFERENCE.json");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const result = await writeJointArtifact(root, resolve(values.source), resolve(values.out));
console.log(JSON.stringify({ digest: result.digest, entries: result.artifact.reference.population.accepted,
  sourcePhones: result.artifact.reference.phones.native.total,
  characters: Object.fromEntries(Object.entries(result.artifact.reference.characters).map(([name, table]) => [name, table.total])) }));
