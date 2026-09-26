import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { drawnSteps } from "./numeric-grid.mjs";
import { sha } from "./integrity.mjs";

export function schedule(protocol) {
  const { blocksPerCase, rowsPerBlock, uint32PerRow } = protocol.tapes;
  const bytesPerBlock = rowsPerBlock * uint32PerRow * 4;
  return protocol.cases.flatMap((spec, caseIndex) => Array.from({ length: blocksPerCase }, (_, block) => ({
    caseId: spec.id, caseIndex, block, rows: rowsPerBlock,
    byteOffset: (caseIndex * blocksPerCase + block) * bytesPerBlock, byteLength: bytesPerBlock,
  })));
}

export function tapeManifest(protocol, bytes, bindings) {
  assert.equal(bytes.length, protocol.tapes.bytes);
  const segments = schedule(protocol).map(segment => ({ ...segment,
    sha256: sha(bytes.subarray(segment.byteOffset, segment.byteOffset + segment.byteLength)) }));
  return { version: "q09-sampler-tape-v1", ...bindings, byteLength: bytes.length, sha256: sha(bytes),
    encoding: "uint32-little-endian", uint32PerRow: protocol.tapes.uint32PerRow,
    primaryFrequencyDraws: protocol.samplerCalls, segments,
    source: "Fresh OS random bytes; independent-uniform-input assumption is not empirically certified" };
}

export function checkTape(protocol, bytes, manifest, bindings) {
  assert.deepEqual(manifest, tapeManifest(protocol, bytes, bindings), "Exact tape bytes, segment schedule and identities");
}

export function tapeRow(bytes, segment, row, width) {
  assert(Number.isInteger(row) && row >= 0 && row < segment.rows);
  const offset = segment.byteOffset + row * width * 4;
  return Array.from({ length: width }, (_, i) => bytes.readUInt32LE(offset + i * 4));
}

export async function pinnedJson(path, expectedSha) {
  const bytes = await readFile(path);
  assert.equal(sha(bytes), expectedSha, "Externally pinned input: " + path);
  return { bytes, value: JSON.parse(bytes) };
}

export function checkAcceptedReference(reference, protocol, freezeSha, engine) {
  assert.equal(reference.version, "q09-independent-sampler-reference-v1");
  assert.equal(reference.passed, true);
  assert.equal(reference.sourceFreezeSha256, freezeSha);
  assert.equal(reference.protocolSha256, protocol.sha256);
  assert.equal(reference.primaryFrequencyDraws, 0);
  assert.deepEqual(reference.engine, engine, "Different engine requires separately identified reference evidence");
  assert.deepEqual(reference.cases.map(value => value.id), protocol.cases.map(value => value.id));
}

export function allMasks(spec) {
  return Array.from({ length: 2 ** spec.n }, (_, mask) => mask).filter(mask => !(mask & 2 ** spec.primary)).map(String);
}

export function sampleMask(sample, spec) {
  assert.equal(sample.marks.length, spec.n);
  let mask = 0, secondary = 0;
  sample.marks.forEach((mark, i) => {
    if (i === spec.primary) assert.equal(mark, "primary");
    else {
      assert(mark === "unmarked" || mark === "secondary");
      if (mark === "secondary") { mask += 2 ** i; secondary++; }
    }
  });
  assert.equal(secondary, spec.K);
  return String(mask);
}

export function witnessKeys(sample, mask) {
  return [`component:${sample.selectedComponentIndex}`,
    ...drawnSteps(sample).map(step => `branch:${step.coordinate.join(":")}:${step.first ? "first" : "second"}`),
    `pattern:${mask}`];
}
