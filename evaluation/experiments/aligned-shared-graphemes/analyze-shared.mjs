import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, mkdir, readFile, readdir, realpath, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { canonical } from "../../quality/serialization.ts";
import { englishConfig } from "../../../src/index.ts";
import { createSharedRepairObserver } from "./observe-repairs.ts";
import { createSharedAggregator } from "./aggregate-shared.mjs";
import { installedDependencies } from "../phoneme-aware-doubling/dependency-closure.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const sha = bytes => createHash("sha256").update(bytes).digest("hex");
async function filePin(path) {
  assert((await lstat(path)).isFile(), `Not a regular file: ${path}`);
  const digest = createHash("sha256"); let bytes = 0;
  for await (const chunk of createReadStream(path)) { digest.update(chunk); bytes += chunk.length; }
  return { bytes, sha256: digest.digest("hex") };
}
export async function regularArtifact(archive, name) {
  assert((await lstat(archive)).isDirectory(), "Archive must be a real directory");
  const parts = name.split("/");
  assert(parts.every(part => part && part !== "." && part !== ".."), "Invalid artifact path");
  let path = archive;
  for (const [index, part] of parts.entries()) {
    path = join(path, part); const stat = await lstat(path);
    assert(index === parts.length - 1 ? stat.isFile() : stat.isDirectory(), "Aliased or nonregular artifact");
  }
  return path;
}
async function pinnedJson(path, expected) {
  assert.match(expected, /^[a-f0-9]{64}$/);
  const bytes = await readFile(path); assert.equal(sha(bytes), expected, `Authority mismatch: ${path}`);
  return JSON.parse(bytes);
}
async function closure() {
  const files = {};
  async function walk(directory) {
    for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      assert(!entry.isSymbolicLink(), `Aliased source: ${path}`);
      if (entry.isDirectory()) await walk(path);
      else files[path] = await filePin(join(root, path));
    }
  }
  for (const directory of ["src", "data/cmu", "evaluation/quality", "evaluation/experiments/phoneme-aware-doubling", "evaluation/experiments/aligned-shared-graphemes"]) await walk(directory);
  for (const path of ["package.json", "package-lock.json", "tsconfig.json"]) files[path] = await filePin(join(root, path));
  return { files, dependencies: await installedDependencies(root), node: process.version, executable: { path: process.execPath, ...await filePin(process.execPath) } };
}
export function expectedStreams(protocol) {
  const streams = new Map();
  assert.equal(protocol.schemaVersion, 1);
  assert(Number.isSafeInteger(protocol.wordsPerReplicate) && protocol.wordsPerReplicate > 0);
  assert(Array.isArray(protocol.profiles) && protocol.profiles.length > 0);
  const profiles = new Set(); const seeds = new Set();
  for (const profile of protocol.profiles) {
    assert.match(profile.id, /^[a-z0-9-]+$/); assert(!profiles.has(profile.id)); profiles.add(profile.id);
    assert(profile.seeds.development.length > 0);
    for (const seed of profile.seeds.development) {
      assert(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff && !seeds.has(seed)); seeds.add(seed);
      const file = `words/${profile.id}-${seed}.jsonl.gz`;
      streams.set(file, { profile: profile.id, seed, words: protocol.wordsPerReplicate });
    }
  }
  return streams;
}
async function readRows(path, consume) {
  let rowError;
  try {
    await pipeline(createReadStream(path), createGunzip(), async source => {
      let pending = "";
      const decoder = new TextDecoder("utf-8", { fatal: true });
      for await (const chunk of source) {
        pending += decoder.decode(chunk, { stream: true });
        let end;
        while ((end = pending.indexOf("\n")) >= 0) {
          const line = pending.slice(0, end); pending = pending.slice(end + 1);
          try {
            assert(line.length > 0, "Empty archive row"); consume(JSON.parse(line));
          } catch (error) { rowError = error; throw error; }
        }
      }
      pending += decoder.decode(); assert.equal(pending, "", "Missing final newline");
    });
  } catch (error) { throw rowError ?? error; }
}

export async function analyze(options) {
  assert((await lstat(resolve(options.archive))).isDirectory(), "Archive must be a real directory");
  const archive = await realpath(resolve(options.archive));
  const requestedOut = resolve(options.out);
  const out = join(await realpath(dirname(requestedOut)), basename(requestedOut));
  for (const input of [archive, await realpath(root)]) {
    const path = relative(input, out);
    assert(path.startsWith("../") || path === "..", "Output must be outside input/source trees");
  }
  const protocol = await pinnedJson(options.protocol, options["protocol-sha256"]);
  const registration = await pinnedJson(options.registration, options["registration-sha256"]);
  assert.equal(registration.version, "q13b-aligned-shared-graphemes-registration-v1");
  const envelope = await pinnedJson(await regularArtifact(archive, "manifest.json"), options["manifest-sha256"]);
  const manifest = envelope.manifest;
  assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.cohort, "development");
  assert.deepEqual(manifest.protocol, protocol);
  assert.equal(manifest.generator.sourceDigest, options["source-digest"]);
  assert(["control", "candidate"].includes(options.variant));
  const config = options.variant === "control"
    ? { ...englishConfig, sharedSpellings: undefined } : englishConfig;
  if (options.variant === "candidate") assert.deepEqual(config.sharedSpellings, registration.constructions, "Inactive candidate shared policy");
  assert.deepEqual(manifest.generator.effectiveConfig, canonical(config), "Configuration differs from replay policy");
  const expected = expectedStreams(protocol);
  const artifactNames = new Set();
  async function verifyArchive() {
    assert.equal(sha(await readFile(join(archive, "manifest.json"))), options["manifest-sha256"]);
    for (const artifact of manifest.artifacts) {
      assert.deepEqual(await filePin(await regularArtifact(archive, artifact.file)),
        { bytes: artifact.bytes, sha256: artifact.sha256 }, artifact.file);
    }
  }
  for (const artifact of manifest.artifacts) {
    assert(!artifactNames.has(artifact.file), "Duplicate artifact"); artifactNames.add(artifact.file);
  }
  assert.deepEqual([...artifactNames].filter(name => name.startsWith("words/")).sort(), [...expected.keys()].sort(), "Wrong stream set");
  const before = await closure(); await verifyArchive();
  await mkdir(out);
  const authority = { archive, sourceRoot: await realpath(root), variant: options.variant, manifestSha256: options["manifest-sha256"],
    sourceDigest: options["source-digest"], protocolSha256: options["protocol-sha256"],
    registrationSha256: options["registration-sha256"], before };
  await writeFile(join(out, "authority.json"), JSON.stringify(authority, null, 2) + "\n", { flag: "wx" });
  const doublingRegistration = JSON.parse(await readFile(join(root, "evaluation/experiments/phoneme-aware-doubling/protocol.json")));
  const accumulator = createSharedAggregator(registration.constructions, doublingRegistration.ordinaryRelations);
  const replay = createSharedRepairObserver(config);
  const streams = [];
  try {
    // Registered profile/seed order defines first-witness selection, not filesystem order.
    for (const [file, stream] of expected) {
      let drawIndex = 0;
      await readRows(await regularArtifact(archive, file), row => {
        assert.equal(row.profile, stream.profile); assert.equal(row.seed, stream.seed);
        assert.equal(row.drawIndex, drawIndex); assert(drawIndex < stream.words, "Extra draw");
        accumulator.add(row, replay(row)); drawIndex++;
      });
      assert.equal(drawIndex, stream.words, "Missing draw");
      streams.push({ ...stream, file }); console.log(file, drawIndex);
    }
    const report = accumulator.finish();
    assert.equal(report.words, expected.size * protocol.wordsPerReplicate);
    await verifyArchive(); assert.deepEqual(await closure(), before, "Measurement closure changed");
    assert.equal(sha(await readFile(options.protocol)), options["protocol-sha256"]);
    assert.equal(sha(await readFile(options.registration)), options["registration-sha256"]);
    const result = { ...report, version: "q13b-shared-corpus-v1", variant: options.variant,
      authoritySha256: sha(await readFile(join(out, "authority.json"))), streams };
    await writeFile(join(out, "report.partial.json"), JSON.stringify(result) + "\n", { flag: "wx" });
    await rename(join(out, "report.partial.json"), join(out, "report.json"));
    return result;
  } catch (error) {
    await writeFile(join(out, "failure.json"), JSON.stringify({ completedStreams: streams, error: String(error) }, null, 2) + "\n", { flag: "wx" });
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const keys = ["archive", "out", "protocol", "protocol-sha256", "registration", "registration-sha256", "manifest-sha256", "source-digest", "variant"];
  const { values } = parseArgs({ options: Object.fromEntries(keys.map(name => [name, { type: "string" }])), strict: true });
  for (const name of keys) assert(values[name], `--${name} is required`);
  await analyze(values);
}
