import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateRegistration, capturePreflight } from "./capture-preflight.mjs";
const registration = JSON.parse(await readFile(new URL("./measurement.json", import.meta.url)));
const protocol = await readFile(new URL("../../quality/protocol.json", import.meta.url));

test("registered corpus has all twenty full replicate streams", () => {
  for (const arm of registration.arms) assert.equal(validateRegistration(registration, protocol, arm).profiles.length, 4);
});
test("reject altered protocol, per-policy count, total count, profiles and arm", () => {
  assert.throws(() => validateRegistration(registration, Buffer.from("{}"), registration.arms[0]));
  assert.throws(() => validateRegistration(registration, protocol, "unregistered"));
  for (const mutate of [r => { r.wordsPerArm = 100; }, r => { r.wordsPerPolicyPerArm = 100; }, r => { r.profiles[0].seeds.development.pop(); }]) {
    const altered = structuredClone(registration); mutate(altered);
    assert.throws(() => validateRegistration(altered, protocol, altered.arms[0]));
  }
});
test("reject capture module rooted outside measured checkout", async () => {
  await assert.rejects(capturePreflight({ root: process.cwd(), captureModuleUrl: new URL("./capture-preflight.mjs", import.meta.url) }), /Capture module must import/);
});
