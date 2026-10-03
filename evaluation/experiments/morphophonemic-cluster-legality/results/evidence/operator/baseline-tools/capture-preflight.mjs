import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function validateRegistration(registration, protocolBytes, arm) {
  assert.equal(registration.version, "q11b-morphology-cluster-baseline-v1");
  assert(registration.arms.includes(arm), "Unregistered arm");
  assert.equal(registration.cohort, "development");
  assert.equal(createHash("sha256").update(protocolBytes).digest("hex"), registration.protocolSha256);
  const protocol = JSON.parse(protocolBytes);
  assert.equal(protocol.wordsPerReplicate, 10000);
  assert.equal(protocol.profiles.length, 4);
  assert(protocol.profiles.every(profile => profile.seeds.development.length === 5));
  const words = protocol.profiles.reduce((sum, profile) => sum + profile.seeds.development.length * protocol.wordsPerReplicate, 0);
  assert.equal(words, registration.wordsPerPolicyPerArm);
  assert.equal(words, 200000);
  assert.equal(registration.wordsPerArm, words * 2);
  assert.deepEqual(registration.profiles, protocol.profiles);
  return protocol;
}

export async function capturePreflight({ root, captureModuleUrl, registrationPath, arm, expectedCommit }) {
  const actualRoot = await realpath(root);
  const moduleRoot = await realpath(resolve(dirname(fileURLToPath(captureModuleUrl)), "../.."));
  assert.equal(moduleRoot, actualRoot, "Capture module must import the generator from the measured checkout");
  const registrationBytes = await readFile(registrationPath);
  const registration = JSON.parse(registrationBytes);
  const protocolBytes = await readFile(join(actualRoot, registration.protocolPath));
  const protocol = validateRegistration(registration, protocolBytes, arm);
  assert.match(expectedCommit, /^[a-f0-9]{40}$/);
  const git = (...args) => execFileSync("git", args, { cwd: actualRoot, encoding: "utf8" }).trim();
  assert.equal(git("rev-parse", "HEAD"), expectedCommit, "Unexpected arm commit");
  assert.equal(git("status", "--porcelain", "--untracked-files=no"), "", "Commit measured inputs before capture");
  if (arm === "composed-control") assert.equal(git("rev-parse", registration.controlCommit), expectedCommit);
  return { registration, protocol, registrationSha256: createHash("sha256").update(registrationBytes).digest("hex") };
}
