import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { validateRegistration } from "./capture-preflight.mjs";

const experiment = fileURLToPath(new URL("../", import.meta.url));
const registration = JSON.parse(await readFile(join(experiment, "treatment-measurement.json")));
const protocolBytes = await readFile(fileURLToPath(new URL("../../../quality/protocol.json", import.meta.url)));

test("registered candidate keeps the complete prospective cohort", () => {
  const protocol = validateRegistration(registration, protocolBytes, "candidate");
  assert.equal(protocol.wordsPerReplicate * protocol.profiles.length * 5, 200000);
});

for (const [name, mutate] of [
  ["sample size", r => { r.wordsPerPolicyPerArm = 10000; }],
  ["cohort", r => { r.cohort = "validation"; }],
  ["profile options", r => { r.profiles[0].options.morphology = false; }],
  ["seed order", r => { r.profiles[0].seeds.development.reverse(); }],
  ["protocol hash", r => { r.protocolSha256 = "0".repeat(64); }],
]) {
  test(`rejects changed ${name}`, () => {
    const changed = structuredClone(registration);
    mutate(changed);
    assert.throws(() => validateRegistration(changed, protocolBytes, "candidate"));
  });
}

test("rejects unregistered or control capture arms", () => {
  for (const arm of ["composed-control", "unknown"]) {
    assert.throws(() => validateRegistration(registration, protocolBytes, arm));
  }
});

test("rejects rehashed undersized protocol", () => {
  const changed = JSON.parse(protocolBytes);
  changed.wordsPerReplicate = 100;
  const bytes = Buffer.from(JSON.stringify(changed));
  const rewritten = { ...registration, protocolSha256: createHash("sha256").update(bytes).digest("hex") };
  assert.throws(() => validateRegistration(rewritten, bytes, "candidate"));
});
