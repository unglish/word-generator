import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { writeSensitivity } from "./sensitivity.js";

const { values } = parseArgs({ options: Object.fromEntries(["baseline", "reference", "distance-module", "out"].map(name => [name, { type: "string" as const }])) });
if (!values.baseline || !values.reference || !values["distance-module"] || !values.out) throw new Error("Use --baseline ORIGINAL_DEVELOPMENT --reference JOINT.json --distance-module FROZEN_DISTRIBUTION.ts --out NEW_REPORT.json");
await writeSensitivity(resolve(dirname(fileURLToPath(import.meta.url)), "../.."), resolve(values.baseline), resolve(values.reference), resolve(values["distance-module"]), resolve(values.out));
