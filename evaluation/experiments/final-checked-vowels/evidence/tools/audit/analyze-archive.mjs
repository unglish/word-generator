import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { endpointCounts } from "./production-endpoints.mjs";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
export function countsFor(word) {
  const counts = {};
  const add = (key, value = 1) => { counts[key] = (counts[key] ?? 0) + value; };
  add("words");
  const t = word.trace ?? {}, m = t.morphology, template = m?.template ?? "no-morphology-plan";
  add(`words/${template === "bare" ? "planned-bare" : template}`);
  if (!t.baseSpelling) add("missingBaseEvidence");
  else {
    if (t.baseSpelling.edits.some(e => e.phase === "gap")) add("words/gap-overridden");
    for (const kind of ["shared", "split"]) {
      const ledger = t.baseSpelling[kind];
      add(`root/${kind}/unavailable`, Number(ledger == null));
      if (ledger) { add(`root/${kind}/constructions`, ledger.constructions.length); add(`root/${kind}/liveConstructions`, ledger.liveConstructionIds.length); }
    }
  }
  if (t.finalNucleus?.repairs.length) add("words/final-nucleus-repaired");
  for (const [name, required] of [["finalNucleus", true], ["pronunciationPasses", true], ["morphologyPreparation", Boolean(m)],
    ["morphologyWriting", ["prefixed", "suffixed", "both"].includes(template)], ["gapSpellingPass", ["bare", "no-morphology-plan"].includes(template)]]) {
    if (required && !(name in t)) add(`missingOperationPackets/${name}`);
  }
  const f = t.finalWord;
  if (!f) { add("missingFinalEvidence"); return counts; }
  for (const phase of ["initial", "cells"]) for (const cell of f.spelling[phase]) add(`cells/${phase}/${cell.part}/${cell.source.kind}`);
  const live = new Set(f.spelling.cells.map(c => c.id));
  const parts = new Map(f.spelling.initial.map(c => [c.id, c.part]));
  for (const event of f.spelling.events) for (const id of event.outputIds) parts.set(id, event.part);
  for (const [id, part] of parts) if (!live.has(id)) add(`cells/deleted/${part}`);
  add("cells/finalPhonemicLicenseUnavailable", f.spelling.cells.length);
  if (f.spelling.events.some(e => e.rule === "repairConsonantLetters")) add("words/final-cleanup-edited");
  for (const e of f.spelling.events) {
    const key = `edits/${e.part}/${e.rule}`;
    add(key); add(`${key}/removedUnits`, e.before.length); add(`${key}/insertedUnits`, e.after.length);
  }
  const origins = new Map(f.phones.initial.map(p => [p.id, p.source]));
  for (const p of f.phones.initial) add(`phones/initial/${p.source.part ?? "bridge"}/${p.source.kind}`);
  const start = word.lexical?.rootSyllableStart ?? 0, length = word.lexical?.root.length ?? 0;
  for (const p of f.phones.final) {
    const origin = origins.get(p.id), part = origin.part ?? "bridge";
    add(`phones/final/${part}/${origin.kind}`);
    if (["prefix", "suffix"].includes(part) && p.syllable >= start && p.syllable < start + length) add(`phones/affixInRoot/${part}`);
  }
  for (const origin of origins.values()) if (origin.kind === "bridge") add(`phones/bridges/${origin.boundary}`);
  for (const change of f.phones.changes) add(`phones/changes/${change.rule}`);
  for (const change of f.phones.realization) add(`phones/realizations/${change.rule}`);
  return counts;
}
async function* rows(path) {
  const reader = createInterface({ input: createReadStream(path).pipe(createGunzip()), crlfDelay: Infinity });
  for await (const line of reader) yield JSON.parse(line);
}
async function checkArtifact(directory, item) {
  const hash = createHash("sha256"); let bytes = 0;
  for await (const chunk of createReadStream(join(directory, item.file))) { hash.update(chunk); bytes += chunk.length; }
  assert.equal(hash.digest("hex"), item.sha256); assert.equal(bytes, item.bytes);
}
async function analyze() {
const [archive, output] = process.argv.slice(2);
assert(archive && output);
const seal = JSON.parse(await readFile(`${archive}-freeze/complete.json`));
assert.equal(seal.passed, true); assert.equal(seal.words, 200000);
const beforeBytes = await readFile(`${archive}-freeze/before.json`);
assert.equal(sha(beforeBytes), seal.beforeSha256);
const frozen = JSON.parse(beforeBytes); assert.deepEqual(seal.after, frozen.before);
const root = frozen.root, arm = frozen.arm, policy = frozen.policy;
assert.equal(execFileSync("git", ["rev-parse", "HEAD"], {cwd:root,encoding:"utf8"}).trim(),frozen.expectedCommit);
assert.equal(execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], {cwd:root,encoding:"utf8"}).trim(),"");
const source = name => import(pathToFileURL(join(root,name)).href);
const {englishConfig}=await source("src/index.ts");
const {verifyLexicalSpellingOperations}=await source("src/core/lexical-spelling-evidence.ts");
const {verifyFinalWordSourceLinks}=await source("src/core/final-word-sources.ts");
const {verifyConfiguredAllomorphs}=await source("src/core/morphology/allomorph-evidence.ts");
const registration=frozen.registration.registration;
assert.equal(registration.version,"q10b2-final-checked-vowels-v1");
const manifestBytes=await readFile(join(archive,"manifest.json")), manifestHash=sha(manifestBytes);
assert.equal(manifestHash,seal.manifest.sha256);assert.equal(manifestBytes.length,seal.manifest.bytes);
const manifest=JSON.parse(manifestBytes).manifest;
assert.equal(manifest.generator.commit,frozen.expectedCommit);assert.equal(manifest.generator.dirty,false);assert.equal(manifest.generator.patch,"");
assert.deepEqual(manifest.protocol,frozen.registration.protocol);assert.equal(manifest.cohort,"development");
const policyBytes=await readFile(join("/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator",registration.activePolicyRegistration.path));
assert.equal(sha(policyBytes),registration.activePolicyRegistration.sha256);
const active=JSON.parse(policyBytes).configuration;
const config=structuredClone(policy==="default"?englishConfig:{...englishConfig,splitVowels:active.splitVowels,followingLetters:active.followingLetters});
const {canonical}=await source("evaluation/quality/serialization.ts");
assert.deepEqual(manifest.generator.effectiveConfig,canonical(config));
for (const item of manifest.artifacts.filter(item=>!item.file.startsWith("words/"))) await checkArtifact(archive,item);
const total = {}, replicates = {}, merge = (target, source) => { for (const [k, v] of Object.entries(source)) target[k] = (target[k] ?? 0) + v; };
for (const profile of manifest.protocol.profiles) for (const seed of profile.seeds.development) {
  const file = `words/${profile.id}-${seed}.jsonl.gz`, items = manifest.artifacts.filter(a => a.file === file);
  assert.equal(items.length, 1); await checkArtifact(archive, items[0]);
  let index = 0; const counts = {};
  for await (const row of rows(join(archive, file))) {
    assert.equal(row.profile, profile.id); assert.equal(row.seed, seed); assert.equal(row.drawIndex, index++);
    assert(row.word.trace?.finalWord,"Final evidence missing");
    verifyLexicalSpellingOperations(row.word,config);verifyFinalWordSourceLinks(row.word);verifyConfiguredAllomorphs(row.word,config);
    merge(counts,countsFor(row.word));merge(counts,endpointCounts(row.word));
  }
  assert.equal(index, 10000); merge(total, counts); replicates[`${profile.id}/${seed}`] = counts;
  console.log(`${profile.id}/${seed}: ${index} records replayed and counted`);
}
assert.equal(total.words,registration.wordsPerPolicyPerArm);
if (arm==="configured-final-vowel-contract") {
  assert.equal(total["endpoint/lexical/configuredViolation"]??0,0);
  assert.equal(total["endpoint/surface/configuredViolation"]??0,0);
}
await writeFile(output,JSON.stringify({manifestSha256:manifestHash,registrationSha256:frozen.registration.registrationSha256,
  protocolSha256:registration.protocolSha256,arm,policy,sourceCommit:frozen.expectedCommit,counts:total,replicates,
  configuredOperationReplayFailures:0,sourceBindingFailures:0,
  scope:"Configured production replay and operational-source binding plus final-vowel counts; independent archived-JSON replay is separate."},null,2)+"\n",{flag:"wx"});

}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await analyze();
