import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { captureRun } from "../../quality/capture.ts";
import { installedDependencies } from "../phoneme-aware-doubling/dependency-closure.mjs";
import { englishConfig } from "../../../src/index.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const experiment = join(root, "evaluation/experiments/following-letter-conditions");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
async function pin(path) {
  assert((await lstat(path)).isFile(), `Nonregular input: ${path}`);
  const hash = createHash("sha256"); let bytes = 0;
  for await (const chunk of createReadStream(path)) { hash.update(chunk); bytes += chunk.length; }
  return { bytes, sha256: hash.digest("hex") };
}
export async function treePins(directory) {
  const files = {};
  async function walk(relative = "") {
    for (const entry of (await readdir(join(directory, relative), { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : 1)) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      assert(!entry.isSymbolicLink(), `Aliased source: ${name}`);
      if (entry.isDirectory()) await walk(name);
      else files[name] = await pin(join(directory, name));
    }
  }
  await walk(); return files;
}
export function executionEnvironment(environment = process.env) {
  const overrides = ["NODE_OPTIONS", "NODE_PATH", "ESBUILD_BINARY_PATH", "TSX_TSCONFIG_PATH"];
  for (const key of overrides) assert(!environment[key], `Unpinned execution override: ${key}`);
  return Object.fromEntries(["PATH", "LANG", "LC_ALL", "TZ", "CI", ...overrides].map(key => [key, environment[key] ?? null]));
}
async function snapshot() {
  const files = {};
  for (const directory of ["src", "evaluation", "data/cmu", "scripts"]) files[directory] = await treePins(join(root, directory));
  for (const name of ["package.json", "package-lock.json", "tsconfig.json", "vitest.perf.config.ts"]) files[name] = await pin(join(root, name));
  return { files, dependencies: await installedDependencies(root), environment: executionEnvironment(),
    node: { version: process.version, path: await realpath(process.execPath), ...await pin(await realpath(process.execPath)) } };
}

export function validateActiveFollowingPolicy(config, registration) {
  assert.deepEqual(config.followingLetters, registration.followingLetters, "Candidate must activate registered following-letter targets");
  assert(registration.followingLetters.targets.length > 0, "Following-letter targets must be nonempty");
  assert(registration.splitVowels.supports.length > 0, "Candidate requires nonempty registered supports");
  assert.deepEqual(config.splitVowels, registration.splitVowels, "Candidate must activate the registered split policy");
  assert.deepEqual(config.sharedSpellings, englishConfig.sharedSpellings, "Shared predecessor policy must remain unchanged");
  assert.equal(config.writtenFormConstraints?.policy, "preserve-phones", "Candidate requires licensed spelling");
}

async function capture(out) {
  // A fresh fixed /private/tmp destination cannot overwrite a source or prior corpus.
  assert.match(out, /^\/private\/tmp\/q14b-following-letters-candidate-v[1-9][0-9]*$/);
  const registrationBytes = await readFile(join(experiment, "measurement.json"));
  const registration = JSON.parse(registrationBytes);
  assert.equal(registration.version, "q14b-following-letter-measurement-v1");
  const configuration = structuredClone({ ...englishConfig, splitVowels: registration.splitVowels, followingLetters: registration.followingLetters });
  validateActiveFollowingPolicy(configuration, registration);
  const registrationPins = JSON.parse(await readFile(join(experiment, "registration-files.json")));
  for (const [name, expected] of Object.entries(registrationPins.files)) assert.deepEqual(await pin(join(experiment, name)), expected);
  const controlBytes = await readFile(registration.controlManifestFile
    ? join(root, registration.controlManifestFile) : join(registration.controlArchive, "manifest.json"));
  assert.equal(sha(controlBytes), registration.controlManifestSha256);
  const protocol = JSON.parse(await readFile(join(root, "evaluation/quality/protocol.json")));
  assert.deepEqual(protocol, JSON.parse(controlBytes).manifest.protocol);
  assert.equal(protocol.wordsPerReplicate, 10000);
  assert.equal(protocol.profiles.length, 4);
  assert(protocol.profiles.every(profile => profile.seeds.development.length === 5));
  const toolPinsBytes = await readFile(join(experiment, "measurement-tools.json"));
  const toolPins = JSON.parse(toolPinsBytes);
  assert.equal(toolPins.version, "q14b-measurement-tools-v1");
  for (const [name, expected] of Object.entries(toolPins.files)) assert.deepEqual(await pin(join(root, name)), expected, `Changed measurement input: ${name}`);
  const evidence = `${out}-freeze`;
  await mkdir(evidence);
  const before = await snapshot();
  await writeFile(join(evidence, "before.json"), JSON.stringify({ version: 1, out, cohort: "development",
    controlManifestSha256: sha(controlBytes), registrationSha256: sha(registrationBytes), measurementToolsSha256: sha(toolPinsBytes), before }, null, 2) + "\n", { flag: "wx" });
  try {
    const summary = await captureRun({ root, out, id: "q14b-following-letters-v1", cohort: "development", protocol, configuration, progress: console.log });
    assert.equal(summary.profiles.reduce((sum, profile) => sum + profile.words, 0), 200000);
    const after = await snapshot();
    assert.deepEqual(after, before, "Frozen execution inputs changed during capture");
    await writeFile(join(evidence, "complete.json"), JSON.stringify({ passed: true, words: 200000,
      beforeSha256: (await pin(join(evidence, "before.json"))).sha256,
      manifest: await pin(join(out, "manifest.json")), after }, null, 2) + "\n", { flag: "wx" });
    console.log("Frozen candidate capture complete:", out);
  } catch (error) {
    await writeFile(join(evidence, "failure.json"), JSON.stringify({ error: String(error), stack: error.stack }, null, 2) + "\n", { flag: "wx" });
    throw error;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, "Provide one fresh candidate archive path");
  await capture(process.argv[2]);
}
