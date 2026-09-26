import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { createGzip } from "node:zlib";
import { ROOT, assertStillFrozen, engineIdentity, freshOutput, loadFreeze, parseArgs, sha, writeExclusive } from "./integrity.mjs";
import { lawInput, sampleRow } from "./numeric-grid.mjs";
import { allMasks, checkAcceptedReference, checkTape, pinnedJson, sampleMask, schedule, tapeRow, witnessKeys } from "./frequency-common.mjs";

/** Injectable only for synthetic tests. The CLI supplies the pinned protocol and public law. */
export async function* captureRecords(createLaw, protocol, bytes, bindings, result) {
  yield JSON.stringify({ kind: "header", version: "q09-sampler-frequency-archive-v1", ...bindings }) + "\n";
  result.blocks = []; result.cases = []; result.primaryFrequencyDraws = 0;
  const segments = schedule(protocol);
  for (const [caseIndex, spec] of protocol.cases.entries()) {
    const law = createLaw(lawInput(protocol, spec));
    const aggregate = Object.fromEntries(allMasks(spec).map(mask => [mask, 0]));
    const firstWitnesses = new Map();
    let caseConsumed = 0;
    for (const segment of segments.filter(value => value.caseIndex === caseIndex)) {
      const counts = Object.fromEntries(allMasks(spec).map(mask => [mask, 0]));
      const digest = createHash("sha256");
      let consumedCells = 0;
      for (let row = 0; row < segment.rows; row++) {
        const tape = tapeRow(bytes, segment, row, protocol.tapes.uint32PerRow);
        const observation = sampleRow(law, spec.K, tape);
        const mask = sampleMask(observation.sample, spec);
        const coordinate = { caseId: spec.id, caseIndex, block: segment.block, row,
          sequence: result.primaryFrequencyDraws, tapeByteOffset: segment.byteOffset + row * protocol.tapes.uint32PerRow * 4 };
        for (const key of witnessKeys(observation.sample, mask)) if (!firstWitnesses.has(key)) firstWitnesses.set(key, { key, ...coordinate });
        const line = JSON.stringify({ kind: "draw", ...coordinate, ...observation }) + "\n";
        digest.update(line); counts[mask]++; aggregate[mask]++; consumedCells += observation.consumed;
        result.primaryFrequencyDraws++;
        yield line;
      }
      caseConsumed += consumedCells;
      result.blocks.push({ caseId: spec.id, block: segment.block, rows: segment.rows, counts, consumedCells,
        unusedCells: segment.rows * protocol.tapes.uint32PerRow - consumedCells, transcriptSha256: digest.digest("hex") });
    }
    result.cases.push({ id: spec.id, rows: protocol.tapes.blocksPerCase * protocol.tapes.rowsPerBlock, counts: aggregate,
      consumedCells: caseConsumed, unusedCells: protocol.tapes.blocksPerCase * protocol.tapes.rowsPerBlock * protocol.tapes.uint32PerRow - caseConsumed,
      witnesses: [...firstWitnesses.values()] });
  }
  assert.equal(result.primaryFrequencyDraws, protocol.samplerCalls);
  yield JSON.stringify({ kind: "footer", primaryFrequencyDraws: result.primaryFrequencyDraws,
    blocks: result.blocks.length, supplementarySamplerCalls: 0 }) + "\n";
}

async function main() {
  const args = parseArgs(process.argv.slice(2), ["freeze", "freeze-sha", "reference", "reference-sha", "tape", "manifest", "manifest-sha", "out", "summary"]);
  const output = await freshOutput(args.out), summaryPath = await freshOutput(args.summary);
  assert.notEqual(output, summaryPath);
  const { freeze, freezeBytes, protocol } = await loadFreeze(args.freeze, args["freeze-sha"]);
  const reference = await pinnedJson(args.reference, args["reference-sha"]);
  const manifest = await pinnedJson(args.manifest, args["manifest-sha"]);
  const bytes = await readFile(args.tape), engine = await engineIdentity();
  checkAcceptedReference(reference.value, { ...protocol, sha256: freeze.protocolSha256 }, sha(freezeBytes), engine);
  const bindings = { sourceFreezeSha256: sha(freezeBytes), protocolSha256: freeze.protocolSha256,
    referenceSha256: sha(reference.bytes), engine };
  checkTape(protocol, bytes, manifest.value, bindings);
  const identities = { ...bindings, tapeManifestSha256: sha(manifest.bytes), tapeSha256: sha(bytes) };
  const { createRootStressLaw } = await import(pathToFileURL(resolve(ROOT, "src/index.ts")).href);
  const result = {}, compressedHash = createHash("sha256");
  let compressedBytes = 0;
  const hashStream = new Transform({ transform(chunk, _encoding, done) { compressedHash.update(chunk); compressedBytes += chunk.length; done(null, chunk); } });
  await pipeline(captureRecords(createRootStressLaw, protocol, bytes, identities, result), createGzip({ mtime: 0 }), hashStream,
    createWriteStream(output, { flags: "wx" }));
  await assertStillFrozen(freeze, args.freeze, freezeBytes);
  assert.deepEqual(await engineIdentity(), engine);
  assert.deepEqual(await readFile(args.tape), bytes, "Tape changed during capture");
  assert.deepEqual(await readFile(args.manifest), manifest.bytes);
  assert.deepEqual(await readFile(args.reference), reference.bytes);
  const summary = { version: "q09-sampler-frequency-capture-v1", ...identities,
    archive: { sha256: compressedHash.digest("hex"), byteLength: compressedBytes }, ...result, supplementarySamplerCalls: 0,
    scope: "Primary draws only; frequencies require independent verification; full raw transcripts retained" };
  await writeExclusive(summaryPath, Buffer.from(JSON.stringify(summary, null, 2) + "\n"));
  console.log(JSON.stringify({ output, summary: summaryPath, archive: summary.archive, primaryFrequencyDraws: result.primaryFrequencyDraws }));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
