import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { PROTOCOL_SHA, parseArgs, sha, snapshotSources, writeExclusive } from "./integrity.mjs";

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = parseArgs(process.argv.slice(2), ["out"]);
  const result = { version: "q09-sampler-source-freeze-v1", protocolSha256: PROTOCOL_SHA, sources: await snapshotSources() };
  const bytes = Buffer.from(JSON.stringify(result, null, 2) + "\n");
  await writeExclusive(args.out, bytes);
  console.log(JSON.stringify({ output: args.out, sha256: sha(bytes), sourceFiles: Object.keys(result.sources).length }));
}
