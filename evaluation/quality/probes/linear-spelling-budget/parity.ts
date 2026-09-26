import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream, lstatSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";
import { createGunzip, gunzipSync } from "node:zlib";
import { readRun } from "../../capture.js";
import { canonical, digest } from "../../serialization.js";
import type { SourceFile } from "../../serialization.js";
import type { Draw, SourceArchive } from "../../model.js";
import type { Word } from "../../../../src/types.js";

type API = typeof import("../../../../src/index.js");
type VerifierAPI = typeof import("../../../../src/core/spelling-evidence.js");
type HashedFile = { file: string; sha256: string };
interface Registration {
  originalCommit: string;
  originalGeneratorDigest: string;
  definitions: HashedFile[];
  fixedDependencies: HashedFile[];
}

const [originalArg, candidateArg, archiveArg, reportArg] = process.argv.slice(2);
assert.ok(originalArg && candidateArg && archiveArg && reportArg,
  "Usage: parity.ts ORIGINAL_RUNTIME CANDIDATE_RUNTIME Q13_ARCHIVE NEW_REPORT.json");
const original = resolve(originalArg);
const candidate = resolve(candidateArg);
const archive = resolve(archiveArg);
const reportPath = resolve(reportArg);
const probeDirectory = "evaluation/quality/probes/linear-spelling-budget";
const sha = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const expectedCandidateDigest = "3dfffb12c5f595507276983f0eae78fedf010726c928ed69cd182db987c3da5b";
const expectedRegistrationDigest = "f5d372ac34ab7f92f1c46c7fec946907c4964745f8b8860ef7ef1451437dac4b";
const expectedProtocolDigest = "451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862";
const expectedEvaluatorDigest = "ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007";

function sourceFiles(root: string, directory: string, recursive = true): SourceFile[] {
  const files: SourceFile[] = [];
  for (const entry of readdirSync(join(root, directory), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    assert.ok(!entry.isSymbolicLink(), `Unpinned source link: ${directory}/${entry.name}`);
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory() && recursive) files.push(...sourceFiles(root, path));
    else if (entry.isFile() && /\.(ts|js|mjs|json)$/.test(path) && !/\.(test|bench)\./.test(path)) {
      files.push({ path, content: readFileSync(join(root, path), "utf8") });
    }
  }
  return files;
}

function hashedFiles(root: string, files: string[]): HashedFile[] {
  return [...new Set(files)].sort().map(file => {
    const stat = lstatSync(join(root, file));
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), `Expected regular file: ${file}`);
    return { file, sha256: sha(readFileSync(join(root, file))) };
  });
}

const registrationText = readFileSync(join(candidate, probeDirectory, "preregistration.json"), "utf8");
assert.equal(sha(registrationText), expectedRegistrationDigest);
const registration = JSON.parse(registrationText) as Registration;
const definitions = [...registration.definitions, ...registration.fixedDependencies];
for (const file of definitions) assert.equal(sha(readFileSync(join(candidate, file.file))), file.sha256, file.file);

function observerFiles(): HashedFile[] {
  const probeFiles = readdirSync(join(candidate, probeDirectory), { withFileTypes: true }).map(entry => {
    assert.ok(entry.isFile() && !entry.isSymbolicLink(), "Probe closure contains a non-file");
    return `${probeDirectory}/${entry.name}`;
  });
  return hashedFiles(candidate, [...sourceFiles(candidate, "evaluation/quality", false).map(file => file.path),
    ...definitions.map(file => file.file), ...probeFiles]);
}

const runtimes = [sourceFiles(original, "src"), sourceFiles(candidate, "src")];
assert.equal(runtimes[0].length, 52);
assert.equal(digest(runtimes[0]), registration.originalGeneratorDigest);
assert.equal(digest(runtimes[1]), expectedCandidateDigest);
assert.deepEqual(runtimes[0].map(file => file.path), runtimes[1].map(file => file.path));
assert.deepEqual(runtimes[1].filter((file, index) => file.content !== runtimes[0][index].content).map(file => file.path), ["src/core/spelling-budget.ts"]);
const observerBefore = observerFiles();
const packageBefore = [original, candidate].map(root => hashedFiles(root, ["package.json", "package-lock.json"]));
assert.deepEqual(packageBefore[0], packageBefore[1]);
const manifestBefore = sha(readFileSync(join(archive, "manifest.json")));
const { manifest, summary } = await readRun(archive, true);
assert.equal(manifest.generator.sourceDigest, registration.originalGeneratorDigest);
assert.equal(manifest.protocolDigest, expectedProtocolDigest);
assert.equal(manifest.evaluatorDigest, expectedEvaluatorDigest);
assert.equal(manifest.cohort, "development");
assert.equal(manifest.protocol.wordsPerReplicate, 10000);
assert.equal(manifest.protocol.profiles.length, 4);
const archivedSources = JSON.parse(gunzipSync(readFileSync(join(archive, "sources.json.gz"))).toString("utf8")) as SourceArchive;
assert.deepEqual(archivedSources.generator, runtimes[0]);
assert.equal(digest({ files: archivedSources.evaluator, definitions: summary.definitions }), expectedEvaluatorDigest);
assert.deepEqual(archivedSources.evaluator, sourceFiles(candidate, "evaluation/quality", false));
assert.equal(digest(archivedSources.references), manifest.referenceDigest);
for (const artifact of manifest.artifacts) {
  const stat = lstatSync(join(archive, artifact.file));
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), `Archive artifact is not a regular file: ${artifact.file}`);
}
const expectedShards = manifest.protocol.profiles.flatMap(profile => {
  assert.equal(profile.seeds.development.length, 5);
  return profile.seeds.development.map(seed => `words/${profile.id}-${seed}.jsonl.gz`);
}).sort();
assert.deepEqual(manifest.artifacts.filter(file => file.file.startsWith("words/")).map(file => file.file).sort(), expectedShards);
const entries = readdirSync(join(archive, "words"), { withFileTypes: true });
assert.ok(entries.every(entry => entry.isFile() && !entry.isSymbolicLink()), "Word shards must all be regular files");
assert.deepEqual(entries.map(entry => `words/${entry.name}`).sort(), expectedShards);

const apis: API[] = await Promise.all([original, candidate].map(root => import(pathToFileURL(join(root, "src/index.ts")).href)));
for (const api of apis) assert.deepEqual(canonical(api.englishConfig), manifest.generator.effectiveConfig);
const verifierAPI: VerifierAPI = await import(pathToFileURL(join(original, "src/core/spelling-evidence.ts")).href);
const verify = verifierAPI.createBaseSpellingEvidenceVerifier(apis[0].englishConfig);
writeFileSync(`${reportPath}.inputs.json`, JSON.stringify({
  createdAt: new Date().toISOString(), original, candidate, archive, node: process.version,
  runtimeDigests: runtimes.map(files => digest(files)), runtimeFiles: runtimes.map(files => files.map(file => ({ file: file.path, sha256: sha(file.content) }))),
  observerFiles: observerBefore, packages: packageBefore, registrationSha256: expectedRegistrationDigest,
  manifestSha256: manifestBefore, protocolDigest: expectedProtocolDigest, evaluatorDigest: expectedEvaluatorDigest,
}, null, 2) + "\n", { flag: "wx" });

function equal(actual: unknown, expected: unknown, coordinate: string, claim: string): void {
  if (isDeepStrictEqual(actual, expected)) return;
  writeFileSync(`${reportPath}.failure.json`, JSON.stringify({ coordinate, claim, actual, expected }, null, 2) + "\n", { flag: "wx" });
  throw new Error(`Parity failed at ${coordinate}: ${claim}; detached witness saved`);
}

const withoutTrace = (word: Word): Word => {
  const plain = { ...word };
  delete plain.trace;
  return plain;
};
const streams = [];
let verifiedCertificates = 0;
let totalDraws = 0;
for (const profile of manifest.protocol.profiles) for (const seed of profile.seeds.development) {
  const variants = apis.flatMap(api => [true, false].map(trace => {
    const rng = api.createSeededRng(seed);
    let calls = 0;
    return { api, trace, rand: () => { calls++; return rng(); }, calls: () => calls, next: rng };
  }));
  const fullHash = createHash("sha256");
  const plainHash = createHash("sha256");
  const rngHash = createHash("sha256");
  let drawIndex = 0;
  let streamCertificates = 0;
  const input = createReadStream(join(archive, `words/${profile.id}-${seed}.jsonl.gz`));
  const gunzip = createGunzip();
  input.on("error", error => gunzip.destroy(error));
  const lines = createInterface({ input: input.pipe(gunzip), crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      assert.ok(line.length > 0, "Empty archived draw");
      const draw = JSON.parse(line) as Draw;
      assert.equal(draw.profile, profile.id);
      assert.equal(draw.seed, seed);
      assert.equal(draw.drawIndex, drawIndex);
      assert.ok(drawIndex < 10000, "Extra archived draw");
      const coordinate = `${profile.id}/${seed}/${drawIndex}`;
      const words = variants.map(({ api, trace, rand }) => api.generateWord({ ...profile.options, trace, rand }));
      equal(words[0], words[2], coordinate, "complete traced words");
      assert.equal(words[1].trace, undefined);
      assert.equal(words[3].trace, undefined);
      const plain = withoutTrace(words[0]);
      for (const other of [words[1], withoutTrace(words[2]), words[3]]) equal(other, plain, coordinate, "complete nontrace words");
      const calls = variants.map(variant => variant.calls());
      equal(calls, [calls[0], calls[0], calls[0], calls[0]], coordinate, "RNG draw boundary");
      const serialized = JSON.stringify(words[2]);
      equal(serialized, JSON.stringify(draw.word), coordinate, "full serialized archived word and trace");
      assert.ok(words[2].trace?.baseSpelling);
      const verified = verify(words[2].trace.baseSpelling);
      assert.equal(verified.version, 2);
      assert.equal(verified.verifiedCertificates, words[2].trace.baseSpelling.certificates?.length ?? 0);
      streamCertificates += verified.verifiedCertificates;
      fullHash.update(serialized + "\n");
      plainHash.update(JSON.stringify(plain) + "\n");
      rngHash.update(`${drawIndex}:${calls[0]}\n`);
      drawIndex++;
    }
  } finally {
    lines.close();
    input.destroy();
    gunzip.destroy();
  }
  assert.equal(drawIndex, 10000);
  const next = variants.map(variant => variant.next());
  equal(next, [next[0], next[0], next[0], next[0]], `${profile.id}/${seed}`, "next RNG at replicate end");
  verifiedCertificates += streamCertificates;
  totalDraws += drawIndex;
  streams.push({ profile: profile.id, seed, draws: drawIndex, calls: variants[0].calls(), nextRng: next[0],
    commonFullTraceDigest: fullHash.digest("hex"), commonPlainWordDigest: plainHash.digest("hex"), rngBoundaryDigest: rngHash.digest("hex"), verifiedCertificates: streamCertificates });
  console.log(`${profile.id}/${seed}: ${drawIndex} exact archive/full-trace/word/RNG matches; ${streamCertificates} verified certificates`);
}
assert.equal(totalDraws, 200000);
assert.equal(streams.length, 20);
await readRun(archive, true);
assert.equal(sha(readFileSync(join(archive, "manifest.json"))), manifestBefore, "Archive manifest changed");
assert.deepEqual([sourceFiles(original, "src"), sourceFiles(candidate, "src")], runtimes, "Runtime changed during parity");
assert.deepEqual(observerFiles(), observerBefore, "Observer/probe/definition source changed during parity");
assert.deepEqual([original, candidate].map(root => hashedFiles(root, ["package.json", "package-lock.json"])), packageBefore, "Dependencies changed during parity");
writeFileSync(reportPath, JSON.stringify({
  schemaVersion: 1, id: "linear-spelling-budget-exact-parity", result: "pass", createdAt: new Date().toISOString(),
  original, candidate, archive, node: process.version, comparedDraws: totalDraws, apiCalls: totalDraws * 4, verifiedCertificates,
  originalGeneratorDigest: digest(runtimes[0]), candidateGeneratorDigest: digest(runtimes[1]),
  runtimeFiles: runtimes.map(files => files.map(file => ({ file: file.path, sha256: sha(file.content) }))), observerFiles: observerBefore,
  preregistrationSha256: expectedRegistrationDigest, inputManifestSha256: manifestBefore, inputsSha256: sha(readFileSync(`${reportPath}.inputs.json`)),
  archiveFullyVerifiedBeforeAndAfter: true, exactSerializedArchiveEquality: true, sourceAndProbeUnchanged: true,
  verifierScope: "Frozen original Q13 production TypeScript verifier, with original inventory/configuration, on every proposed v2 ledger and certificate; not an independent reading implementation.",
  qualityInference: "All 200,000 complete archived words/traces match exactly; the unchanged deterministic quality metrics therefore remain equal.",
  streams,
}, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ result: "pass", comparedDraws: totalDraws, apiCalls: totalDraws * 4, verifiedCertificates }));
