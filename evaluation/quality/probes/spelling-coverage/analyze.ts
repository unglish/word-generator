import { observeSpelling, type Counts } from "./observe.js";
export { observeSpelling } from "./observe.js";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { createGunzip, gunzipSync } from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readRun } from "../../capture.js";
import type { Draw } from "../../model.js";
import type { BaseSpellingTrace } from "../../../../src/core/base-spelling.js";
import { createBaseSpellingEvidenceVerifier } from "../../../../src/core/spelling-evidence.js";

const sha = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");

function morphologyStratum(draw: Draw): string {
  const morphology = draw.word.trace!.morphology;
  if (!morphology) return "bare";
  const realization = morphology.realization;
  const prefix = realization ? !!realization.prefix : !!morphology.prefix;
  const suffix = realization ? !!realization.suffix : !!morphology.suffix;
  const stratum = prefix ? suffix ? "both" : "prefix" : suffix ? "suffix" : "bare";
  return !realization && (prefix || suffix) ? `planned-only:${stratum}` : stratum;
}

function runtimeFiles(root: string, directory = "src"): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
    assert.ok(!entry.isSymbolicLink(), "Runtime source links are not pinned files");
    const file = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...runtimeFiles(root, file));
    else if (entry.isFile() && /\.(ts|js|mjs|json)$/.test(file) && !/\.(test|bench)\./.test(file)) files.push(file);
  }
  return files.sort();
}

async function analyze(directory: string, runtime: string) {
  const { manifest } = await readRun(directory, true);
  assert.equal(manifest.cohort, "development");
  assert.equal(manifest.evaluatorDigest, "ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007");
  assert.equal(manifest.protocolDigest, "451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862");
  assert.equal(manifest.protocol.wordsPerReplicate, 10000);
  const source = JSON.parse(gunzipSync(readFileSync(join(directory, "sources.json.gz"))).toString("utf8")) as { generator: Array<{ path: string; content: string }> };
  assert.deepEqual(runtimeFiles(runtime), source.generator.map(file => file.path).sort(), "Runtime source file set mismatch");
  for (const file of source.generator) assert.equal(readFileSync(join(runtime, file.path), "utf8"), file.content, `Runtime source mismatch: ${file.path}`);
  const api = await import(pathToFileURL(join(runtime, "src/index.ts")).href) as typeof import("../../../../src/index.js");
  const verify = createBaseSpellingEvidenceVerifier(api.englishConfig);
  const profiles: Record<string, Counts> = {};
  const strata: Record<string, Counts> = {};
  const replicates: Record<string, Counts> = {};
  const total: Counts = {};
  const witnesses: Record<string, unknown[]> = {};
  const files = manifest.artifacts.filter(artifact => artifact.file.startsWith("words/")).map(artifact => artifact.file).sort();
  const expected = manifest.protocol.profiles.flatMap(profile => profile.seeds.development.map(seed => `words/${profile.id}-${seed}.jsonl.gz`)).sort();
  assert.deepEqual(files, expected);
  const entries = readdirSync(join(directory, "words"), { withFileTypes: true });
  assert.ok(entries.every(entry => entry.isFile() && !entry.isSymbolicLink()), "Word shards must be regular files");
  assert.deepEqual(entries.map(entry => entry.name).sort(), expected.map(file => file.slice(6)));
  for (const profile of manifest.protocol.profiles) for (const seed of profile.seeds.development) {
    const counts: Counts = {}; let drawIndex = 0;
    const lines = createInterface({ input: createReadStream(join(directory, `words/${profile.id}-${seed}.jsonl.gz`)).pipe(createGunzip()), crlfDelay: Infinity });
    for await (const line of lines) {
      assert.ok(line); const draw = JSON.parse(line) as Draw;
      assert.equal(draw.profile, profile.id); assert.equal(draw.seed, seed); assert.equal(draw.drawIndex, drawIndex++);
      const base: BaseSpellingTrace = draw.word.trace!.baseSpelling!;
      assert.ok(base, "Missing observed base ledger; do not infer historical ownership");
      const result = verify(base);
      assert.equal(result.verifiedCertificates, base.certificates?.length ?? 0);
      for (const group of [counts, total, profiles[profile.id] ??= {}, strata[`${profile.id}/${morphologyStratum(draw)}`] ??= {}]) observeSpelling(draw, group);
      for (const outcome of draw.word.trace!.spellingBudgets ?? []) {
        if (outcome.status === "satisfied") continue;
        const key = `${profile.id}/${outcome.scope}/${outcome.status === "infeasible" ? outcome.reason : outcome.status}`;
        const examples = witnesses[key] ??= [];
        if (examples.length < 2) examples.push({ profile: profile.id, seed, drawIndex: draw.drawIndex, word: draw.word });
      }
    }
    assert.equal(drawIndex, 10000); replicates[`${profile.id}/${seed}`] = counts;
    console.log(`${manifest.id}/${profile.id}/${seed}: ${drawIndex} verified`);
  }
  assert.equal(total.words, 200000);
  return { directory, runtime, id: manifest.id, manifestSha256: sha(readFileSync(join(directory, "manifest.json"))),
    sourceDigest: manifest.generator.sourceDigest, evaluatorDigest: manifest.evaluatorDigest, protocolDigest: manifest.protocolDigest,
    referenceDigest: manifest.referenceDigest, total, profiles, strata, replicates, witnesses };
}

/** Conservative source closure: all source modules and the frozen evaluator, plus this probe. */
function observerSources(): Array<{ file: string; sha256: string }> {
  const root = fileURLToPath(new URL("../../../../", import.meta.url));
  const files: string[] = [];
  function collect(directory: string, recursive: boolean): void {
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory() && recursive) collect(file, true);
      else if (entry.isFile() && /\.(ts|js|mjs|json)$/.test(file) && !/\.(test|bench)\./.test(file)) files.push(file);
    }
  }
  collect("src", true);
  collect("evaluation/quality", false);
  for (const file of ["analyze.ts", "observe.ts", "README.md"]) files.push(`evaluation/quality/probes/spelling-coverage/${file}`);
  return files.sort().map(file => ({ file, sha256: sha(readFileSync(join(root, file))) }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [baselineArg, candidateArg, baselineRuntimeArg, candidateRuntimeArg, outputArg] = process.argv.slice(2);
  assert.ok(baselineArg && candidateArg && baselineRuntimeArg && candidateRuntimeArg && outputArg,
    "Usage: analyze.ts BASELINE_RUN CANDIDATE_RUN BASELINE_RUNTIME CANDIDATE_RUNTIME NEW_REPORT.json");
  const observerFiles = observerSources();
  const baseline = await analyze(resolve(baselineArg), resolve(baselineRuntimeArg));
  const candidate = await analyze(resolve(candidateArg), resolve(candidateRuntimeArg));
  for (const field of ["evaluatorDigest", "protocolDigest", "referenceDigest"] as const) assert.equal(baseline[field], candidate[field]);
  assert.deepEqual(observerSources(), observerFiles, "Observer source changed during analysis");
  writeFileSync(resolve(outputArg), JSON.stringify({ version: 1, implementationRevision: 2, id: "spelling-coverage", observerFiles, baseline, candidate }, null, 2) + "\n", { flag: "wx" });
}
