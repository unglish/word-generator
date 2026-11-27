import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { verifyArchive } from "./archive.js";
import { buildReference } from "./reference.js";
import { writePacket } from "./packet.js";

const [first, ...rest] = process.argv.slice(2);
const print = (result: unknown) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

try {
  if (first === "verify-archive") {
    const { values } = parseArgs({ args: rest, options: { "root-strata": { type: "boolean" } } });
    print(values["root-strata"] ? await verifyArchive(true) : await verifyArchive());
  } else if (first === "build-reference") {
    const { values } = parseArgs({ args: rest, options: { dictionary: { type: "string" }, out: { type: "string" } } });
    if (!values.dictionary) throw new Error("--dictionary is required.");
    print(await buildReference(resolve(values.dictionary), values.out === undefined ? undefined : resolve(values.out)));
  } else {
    const { values } = parseArgs({ args: process.argv.slice(2), options: {
      before: { type: "string" }, after: { type: "string" }, out: { type: "string" },
      "before-engine": { type: "string" }, "after-engine": { type: "string" },
    } });
    if (!values.before || !values.after || !values.out) throw new Error("--before, --after, and --out are required.");
    for (const value of [values["before-engine"], values["after-engine"]]) {
      if (value !== undefined && (!value.trim() || /[\r\n]/.test(value))) throw new Error("Engine labels must be nonempty and single-line.");
    }
    print(await writePacket({
      before: resolve(values.before), after: resolve(values.after),
      engineLabels: { before: values["before-engine"], after: values["after-engine"] },
    }, resolve(values.out)));
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
