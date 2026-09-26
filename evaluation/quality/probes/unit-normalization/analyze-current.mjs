import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createGunzip, gunzipSync } from "node:zlib";
import { canonical, digest } from "../../serialization.ts";
import { readRun } from "../../capture.ts";
import { englishConfig } from "../../../../src/index.ts";
import { createCurrentSpellingObserver, normalizationReplaySummary } from "./observe-current.ts";

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, "../../../..");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const json = value => JSON.stringify(value, null, 2) + "\n";
const code = path => /\.(ts|js|mjs|json)$/.test(path);
const extras = ["package.json", "package-lock.json", "tsconfig.json", "evaluation/quality/protocol.json", "evaluation/quality/probes/unit-normalization/analyzer-contract-v1.md", "evaluation/quality/probes/unit-normalization/parity-contract-v1.md"];

export async function regularFile(parent, path) {
  assert.equal((await lstat(parent)).isDirectory(), true, "Input root is an alias or not a directory");
  const parts = path.split("/");
  assert(parts.every(part => part && part !== "." && part !== ".."), "Invalid relative input path");
  let current = parent;
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    const stat = await lstat(current);
    assert.equal(index === parts.length - 1 ? stat.isFile() : stat.isDirectory(), true, path);
  }
  return current;
}
async function discover(parent, directory) {
  assert.equal((await lstat(join(parent, directory))).isDirectory(), true);
  const paths = [];
  for (const entry of await readdir(join(parent, directory), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    assert(!entry.isSymbolicLink(), `Aliased input: ${path}`);
    if (entry.isDirectory()) paths.push(...await discover(parent, path));
    else { assert(entry.isFile()); if (code(path)) paths.push(path); }
  }
  return paths.sort();
}
async function record(parent, file) {
  const path = await regularFile(parent, file);
  const hash = createHash("sha256"); let bytes = 0;
  for await (const chunk of createReadStream(path)) { hash.update(chunk); bytes += chunk.length; }
  return { file, bytes, sha256: hash.digest("hex") };
}
async function closure() {
  const registration = JSON.parse(await readFile(join(directory, "registration.json")));
  const preparation = [];
  for (const pin of registration.files) {
    const actual = await record(directory, pin.file); assert.deepStrictEqual(actual, pin);
    preparation.push(actual);
  }
  const paths = [...new Set([...await discover(root, "src"), ...await discover(root, "evaluation/quality"), ...extras])].sort();
  return { version: 1, scope: "complete source and quality-code closure; registered historical fixtures preserved",
    files: await Promise.all(paths.map(path => record(root, path))), preparation,
    registrationSha256: sha(await readFile(join(directory, "registration.json"))),
    effectiveConfig: canonical(englishConfig), node: process.version,
    executable: { path: process.execPath, sha256: sha(await readFile(process.execPath)) } };
}
async function destination(path) {
  try { return await realpath(path); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    const parent = dirname(path); assert.notEqual(parent, path);
    return join(await destination(parent), basename(path));
  }
}
export async function protectOutput(out, inputs) {
  const target = await destination(resolve(out));
  for (const input of inputs) {
    const parent = await realpath(input);
    const path = relative(parent, target);
    assert(path !== "" && (path.startsWith("../") || path === ".."), "Output overlaps protected input");
  }
  try { await lstat(out); } catch (error) { if (error.code === "ENOENT") return; throw error; }
  throw new Error("Output already exists");
}
export async function freezeAnalyzer(out) {
  await protectOutput(out, [root]);
  const frozen = await closure();
  await writeFile(out, json(frozen), { flag: "wx" });
  return { path: out, sha256: sha(Buffer.from(json(frozen))) };
}
export async function exactArchive(run, manifest) {
  const expected = ["manifest.json", ...manifest.artifacts.map(pin => pin.file)].sort();
  assert.equal(new Set(expected).size, expected.length, "Duplicate archive path");
  const actual = [];
  for (const entry of await readdir(run, { withFileTypes: true })) {
    if (entry.name === "words") { assert(entry.isDirectory()); continue; }
    assert(entry.isFile(), `Unexpected archive entry ${entry.name}`); actual.push(entry.name);
  }
  for (const entry of await readdir(join(run, "words"), { withFileTypes: true })) {
    assert(entry.isFile(), `Unexpected shard entry ${entry.name}`); actual.push(`words/${entry.name}`);
  }
  assert.deepStrictEqual(actual.sort(), expected, "Archive filesystem set differs");
  for (const pin of manifest.artifacts) assert.deepStrictEqual(await record(run, pin.file), pin);
  const shards = manifest.protocol.profiles.flatMap(profile => profile.seeds.development.map(seed => `words/${profile.id}-${seed}.jsonl.gz`)).sort();
  assert.deepStrictEqual(manifest.artifacts.filter(pin => pin.file.startsWith("words/")).map(pin => pin.file).sort(), shards);
}
export async function* readDraws(path) {
  const input = createReadStream(path); const unzip = createGunzip();
  input.on("error", error => unzip.destroy(error)); input.pipe(unzip); unzip.setEncoding("utf8");
  let pending = "";
  try {
    for await (const chunk of unzip) {
      pending += chunk;
      let end;
      while ((end = pending.indexOf("\n")) >= 0) {
        assert(end > 0, "Empty draw row"); yield JSON.parse(pending.slice(0, end)); pending = pending.slice(end + 1);
      }
    }
    assert.equal(pending, "", "Unterminated draw row");
  } finally { input.destroy(); unzip.destroy(); }
}
const add = (to, counts) => { for (const [key, value] of Object.entries(counts)) { assert(Number.isSafeInteger(value) && value >= 0, key); to[key] = (to[key] ?? 0) + value; assert(Number.isSafeInteger(to[key]), key); } };
function morphology(word) {
  const observed = word.trace?.morphology;
  const resolved = observed?.realization;
  const forms = resolved ?? observed;
  const name = forms?.prefix ? forms.suffix ? "both" : "prefix" : forms?.suffix ? "suffix" : "bare";
  return !resolved && name !== "bare" ? `planned-only:${name}` : name;
}
export async function verifyAnalyzerFreeze(freeze, expectedFreeze) {
  await regularFile(dirname(resolve(freeze)), basename(freeze));
  const frozenBytes = await readFile(freeze); assert.equal(sha(frozenBytes), expectedFreeze, "Unreviewed analyzer freeze");
  const frozen = JSON.parse(frozenBytes); assert.deepStrictEqual(await closure(), frozen);
  return { frozen, frozenBytes };
}
export async function analyzeCurrent({ freeze, expectedFreeze, run, expectedManifest, out }) {
  await protectOutput(out, [root, run]);
  const { frozen, frozenBytes } = await verifyAnalyzerFreeze(freeze, expectedFreeze);
  await regularFile(run, "manifest.json");
  const manifestBytes = await readFile(join(run, "manifest.json")); assert.equal(sha(manifestBytes), expectedManifest, "Unreviewed archive manifest");
  const { manifest, summary } = await readRun(run, true);
  const protocol = JSON.parse(await readFile(join(directory, "protocol.json")));
  assert.equal(manifest.cohort, "development");
  assert.equal(manifest.protocolDigest, protocol.control.protocolDigest);
  assert.equal(manifest.evaluatorDigest, protocol.control.evaluatorDigest);
  assert.equal(manifest.referenceDigest, protocol.control.referenceDigest);
  assert.deepStrictEqual(manifest.generator.effectiveConfig, frozen.effectiveConfig);
  await exactArchive(run, manifest);
  const sources = JSON.parse(gunzipSync(await readFile(join(run, "sources.json.gz"))));
  assert.equal(digest(sources.generator), manifest.generator.sourceDigest);
  assert.equal(digest(sources.references), manifest.referenceDigest);
  assert.equal(digest({ files: sources.evaluator, definitions: summary.definitions }), manifest.evaluatorDigest);
  const observe = createCurrentSpellingObserver(englishConfig);
  const total = {}; const profiles = {}; const streams = {}; const strata = {};
  for (const profile of manifest.protocol.profiles) for (const seed of profile.seeds.development) {
    const counts = {}; let index = 0;
    for await (const draw of readDraws(join(run, "words", `${profile.id}-${seed}.jsonl.gz`))) {
      assert(index < manifest.protocol.wordsPerReplicate); assert.equal(draw.profile, profile.id);
      assert.equal(draw.seed, seed); assert.equal(draw.drawIndex, index++);
      const observed = observe(draw);
      add(counts, observed); add(total, observed); add(profiles[profile.id] ??= {}, observed);
      add(strata[`${profile.id}/${morphology(draw.word)}`] ??= {}, observed);
    }
    assert.equal(index, 10000); streams[`${profile.id}/${seed}`] = counts;
  }
  assert.equal(total.words, 200000); assert.equal(Object.keys(streams).length, 20);
  await exactArchive(run, manifest);
  assert.deepStrictEqual(await readFile(join(run, "manifest.json")), manifestBytes);
  assert.deepStrictEqual(await readFile(freeze), frozenBytes); assert.deepStrictEqual(await closure(), frozen);
  const replay = Object.fromEntries(Object.entries({ total, ...profiles, ...streams, ...strata }).map(([key, counts]) => [key, normalizationReplaySummary(counts)]));
  const result = { version: 1, scope: "version-dispatched structural counting plus production license replay; not an independent raw recount or human-quality judgment",
    analyzerFreezeSha256: expectedFreeze, archiveManifestSha256: expectedManifest, archiveSourceDigest: manifest.generator.sourceDigest,
    total, profiles, streams, strata, replay };
  await writeFile(out, json(result), { flag: "wx" }); return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  if (command === "freeze" && args.length === 1) console.log(await freezeAnalyzer(resolve(args[0])));
  else if (command === "analyze" && args.length === 5) {
    const [freeze, expectedFreeze, run, expectedManifest, out] = args;
    await analyzeCurrent({ freeze: resolve(freeze), expectedFreeze, run: resolve(run), expectedManifest, out: resolve(out) });
  } else throw new Error("Usage: analyze-current.mjs freeze OUT | analyze FREEZE FREEZE_SHA RUN MANIFEST_SHA OUT");
}
