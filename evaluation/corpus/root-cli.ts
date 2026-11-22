import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { writeRootReference } from "./root-reference.js";

const { values: { source, scowl, wordnet, out } } = parseArgs({
  options: { source: { type: "string" }, scowl: { type: "string" }, wordnet: { type: "string" }, out: { type: "string" } },
});
if (!source || !scowl || !wordnet || !out) {
  throw new Error("Use --source PINNED_CMU --scowl PINNED_SCOWL.tar.gz --wordnet PINNED_WORDNET.tar.gz --out NEW_REFERENCE.json");
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
console.log(JSON.stringify(await writeRootReference(root, { source, scowl, wordnet, out })));
