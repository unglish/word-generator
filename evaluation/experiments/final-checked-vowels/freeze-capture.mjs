import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { capturePreflight } from "./capture-preflight.mjs";
import { installedDependencies } from "../phoneme-aware-doubling/dependency-closure.mjs";

async function pin(path) {
  assert((await lstat(path)).isFile(), `Nonregular input: ${path}`);
  const hash = createHash("sha256"); let bytes = 0;
  for await (const chunk of createReadStream(path)) { hash.update(chunk); bytes += chunk.length; }
  return { bytes, sha256: hash.digest("hex") };
}
async function treePins(directory) {
  const files = {};
  async function walk(relative = "") {
    for (const entry of (await readdir(join(directory, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      assert(!entry.isSymbolicLink(), `Aliased input: ${name}`);
      if (entry.isDirectory()) await walk(name);
      else files[name] = await pin(join(directory, name));
    }
  }
  await walk(); return files;
}
async function snapshot(root) {
  const files = {};
  for (const directory of ["src", "evaluation", "data/cmu", "scripts"]) files[directory] = await treePins(join(root, directory));
  for (const name of ["package.json", "package-lock.json", "tsconfig.json", "vitest.perf.config.ts"]) files[name] = await pin(join(root, name));
  const overrides = ["NODE_OPTIONS", "NODE_PATH", "ESBUILD_BINARY_PATH", "TSX_TSCONFIG_PATH"];
  for (const key of overrides) assert(!process.env[key], `Unpinned execution override: ${key}`);
  const environment = Object.fromEntries(["PATH", "LANG", "LC_ALL", "TZ", "CI", ...overrides].map(key => [key, process.env[key] ?? null]));
  const nodePath = await realpath(process.execPath);
  return { files, dependencies: await installedDependencies(root), environment,
    node: { version: process.version, path: nodePath, ...await pin(nodePath) } };
}

export async function frozenCapture({ root, arm, policy, expectedCommit, out }) {
  assert(["default", "active"].includes(policy), "Unknown policy");
  assert.equal(out, `/private/tmp/q10b2-${arm}-${policy}-v1`);
  root = await realpath(root);
  const runnerRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const registrationPath = join(runnerRoot, "evaluation/experiments/final-checked-vowels/measurement.json");
  const captureModuleUrl = pathToFileURL(join(root, "evaluation/quality/capture.ts"));
  const preflightArgs = { root, captureModuleUrl, registrationPath, arm, expectedCommit };
  const registration = await capturePreflight(preflightArgs);
  const evidence = `${out}-freeze`;
  await mkdir(evidence);
  const save = (name, value) => writeFile(join(evidence, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  try {
    const before = await snapshot(root);
    const runnerBefore = await treePins(join(runnerRoot, "evaluation/experiments/final-checked-vowels"));
    await save("before.json", { root, arm, policy, expectedCommit, registration, before, runnerBefore });
    // Resolve both modules from the measured arm, including the capture module's static generator imports.
    const { captureRun } = await import(captureModuleUrl.href);
    const { englishConfig } = await import(pathToFileURL(join(root, "src/index.ts")).href);
    const policyPath = join(runnerRoot, registration.registration.activePolicyRegistration.path);
    assert.equal((await pin(policyPath)).sha256, registration.registration.activePolicyRegistration.sha256);
    const active = JSON.parse(await readFile(policyPath, "utf8")).configuration;
    assert(active.splitVowels.supports.length > 0 && active.followingLetters.targets.length > 0);
    const configuration = structuredClone(policy === "default" ? englishConfig : { ...englishConfig,
      splitVowels: active.splitVowels, followingLetters: active.followingLetters });
    const summary = await captureRun({ root, out, id: `q10b2-${arm}-${policy}`, cohort: "development",
      protocol: registration.protocol, configuration, progress: console.log });
    assert.equal((await pin(policyPath)).sha256, registration.registration.activePolicyRegistration.sha256);
    assert.equal(summary.profiles.reduce((sum, profile) => sum + profile.words, 0), 200000);
    const after = await snapshot(root);
    assert.deepEqual(after, before, "Measured execution inputs changed during capture");
    assert.deepEqual(await treePins(join(runnerRoot, "evaluation/experiments/final-checked-vowels")), runnerBefore, "Capture runner or registration changed");
    assert.deepEqual(await capturePreflight(preflightArgs), registration);
    await save("complete.json", { passed: true, words: 200000, manifest: await pin(join(out, "manifest.json")),
      beforeSha256: (await pin(join(evidence, "before.json"))).sha256, after });
  } catch (error) {
    await save("failure.json", { error: String(error), stack: error.stack });
    throw error;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 7, "Provide root, arm, policy, full commit and fresh output path");
  await frozenCapture({ root: process.argv[2], arm: process.argv[3], policy: process.argv[4], expectedCommit: process.argv[5], out: process.argv[6] });
}
