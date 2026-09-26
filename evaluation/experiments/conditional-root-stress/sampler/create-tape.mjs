import assert from "node:assert/strict";
import { randomFillSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertStillFrozen, engineIdentity, freshOutput, loadFreeze, parseArgs, sha, writeExclusive } from "./integrity.mjs";
import { checkAcceptedReference, pinnedJson, tapeManifest } from "./frequency-common.mjs";

export function makeTape(protocol, bindings, fill = randomFillSync) {
  const bytes = Buffer.alloc(protocol.tapes.bytes);
  fill(bytes);
  return { bytes, manifest: tapeManifest(protocol, bytes, bindings) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2), ["freeze", "freeze-sha", "reference", "reference-sha", "out", "manifest"]);
  const output = await freshOutput(args.out), manifestPath = await freshOutput(args.manifest);
  assert.notEqual(output, manifestPath, "Tape and manifest need distinct fresh paths");
  const { freeze, freezeBytes, protocol } = await loadFreeze(args.freeze, args["freeze-sha"]);
  const reference = await pinnedJson(args.reference, args["reference-sha"]);
  const engine = await engineIdentity();
  checkAcceptedReference(reference.value, { ...protocol, sha256: freeze.protocolSha256 }, sha(freezeBytes), engine);
  const bindings = { sourceFreezeSha256: sha(freezeBytes), protocolSha256: freeze.protocolSha256,
    referenceSha256: sha(reference.bytes), engine };
  const { bytes, manifest } = makeTape(protocol, bindings);
  await assertStillFrozen(freeze, args.freeze, freezeBytes);
  assert.deepEqual(await engineIdentity(), engine);
  assert.deepEqual(await readFile(args.reference), reference.bytes);
  // A failed second publication leaves the first file intact; never replace or regenerate it.
  await writeExclusive(output, bytes);
  await writeExclusive(manifestPath, Buffer.from(JSON.stringify(manifest, null, 2) + "\n"));
  console.log(JSON.stringify({ output, manifest: manifestPath, tapeSha256: manifest.sha256,
    manifestSha256: sha(await readFile(manifestPath)), primaryFrequencyDraws: 0 }));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
