import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";
import type { Word } from "../../../../src/types.js";
import type { GraphemeTrace, OrthographyTrace } from "../../../../src/core/trace.js";

type Counts = Record<string, number>;
interface Location { profile: string; seed: number; drawIndex: number }
export interface EtProbe {
  counts: Counts;
  strata: Record<string, Counts>;
  repairs: Record<string, Counts>;
  witnesses: Record<string, Array<{ word: Word; location?: Location }>>;
}
const add = (counts: Counts, key: string, amount = 1) => { counts[key] = (counts[key] ?? 0) + amount; };
export const emptyProbe = (): EtProbe => ({ counts: {}, strata: {}, repairs: {}, witnesses: {} });
const occurrences = (text: string, pattern: string): number => {
  let count = 0;
  for (let i = 0; i <= text.length - pattern.length; i++) if (text.startsWith(pattern, i)) count++;
  return count;
};

export function adjacency(vowel: GraphemeTrace, next: GraphemeTrace): string {
  if (vowel.syllableIndex !== next.syllableIndex) return "cross-syllable";
  return vowel.position === "nucleus" && next.position === "coda" ? "same-rime" : "other";
}

function syllablePosition(index: number, last: number): string {
  if (last === 0) return "isolated";
  if (index === 0) return "initial";
  return index === last ? "final" : "medial";
}

function ownedLetters(orthography: OrthographyTrace, index: number): string {
  return orthography.chars.filter(char => char.graphemeSelectionIndex === index).map(char => char.char).join("");
}

function ownedOccurrences(orthography: OrthographyTrace, pattern: string, vowel: number, next: number): number {
  let count = 0;
  for (let i = 0; i <= orthography.surface.length - pattern.length; i++) {
    if (!orthography.surface.startsWith(pattern, i)) continue;
    const owners = orthography.chars.slice(i, i + pattern.length);
    if (owners.length !== pattern.length) continue;
    if (owners.every((char, offset) => char.index === i + offset && char.graphemeSelectionIndex === (offset === 2 ? next : vowel))) count++;
  }
  return count;
}

const stringRepairRules = new Set([
  "repairConsonantPileups", "repairJunctions:backstop", "repairConsonantPileups:postJunction",
  "repairConsonantLetters", "repairFinalConsonantLetters", "repairVowelLetters", "postSpellingBackstop",
]);
const isStringRepair = (rule: string): boolean => stringRepairRules.has(rule) || rule.startsWith("spellingRule:") || rule.startsWith("gapSpelling:");

export function observeWord(probe: EtProbe, word: Word, location?: Location): void {
  const trace = word.trace;
  if (!trace) throw new Error("The ordinary-et probe requires a trace for every word.");
  const choices = trace.graphemeSelections;
  const orthography = trace.orthography;
  const finalAligned = orthography?.surface === word.written.clean;
  const count = probe.counts;
  add(count, "words");
  add(count, "graphemeDecisions", choices.length);
  for (const pattern of ["ea", "eat"]) {
    add(count, `rawFinal:${pattern}`, occurrences(word.written.clean, pattern));
    if (orthography) add(count, `rawBase:${pattern}`, occurrences(orthography.surface, pattern));
    if (finalAligned) add(count, `alignedFinal:${pattern}`, occurrences(word.written.clean, pattern));
  }
  add(count, orthography ? "baseOwnershipWords" : "unknownBaseOwnershipWords");
  add(count, finalAligned ? "finalOwnershipWords" : "unknownFinalOwnershipWords");
  const lastSyllable = choices.reduce((last, choice) => Math.max(last, choice.syllableIndex), 0);
  const morphology = trace.morphology;
  const actualMorphology = morphology && morphology.template !== "bare" && (morphology.prefix || morphology.suffix) ? morphology.template : "bare";
  let eligibleWord = false;
  for (let i = 0; i + 1 < choices.length; i++) {
    const vowel = choices[i];
    const next = choices[i + 1];
    if (vowel.phoneme !== "ɛ" || next.phoneme !== "t") continue;
    if (next.index !== vowel.index + 1) throw new Error("Nonconsecutive grapheme decisions cannot establish phoneme adjacency.");
    eligibleWord = true;
    const boundary = adjacency(vowel, next);
    const position = syllablePosition(vowel.syllableIndex, lastSyllable);
    const key = `${boundary}/${position}/vowel:${i === 0 ? "initial" : "medial"}/t:${i + 1 === choices.length - 1 ? "final" : "nonfinal"}/${actualMorphology}/returned-syllables:${word.syllables.length}`;
    const stratum = probe.strata[key] ??= {};
    const pairAdd = (name: string, value = 1) => { add(count, name, value); add(stratum, name, value); };
    pairAdd("eligiblePairs");
    const previous = choices[i - 1];
    const consonantalYMagicE = previous?.phoneme === "j" && previous.emitted === "y" &&
      previous.syllableIndex === vowel.syllableIndex && next.syllableIndex === vowel.syllableIndex &&
      vowel.emitted === "e" && next.emitted === "t" && trace.repairs.some(repair =>
      repair.rule === "spellingRule:magic-e" && repair.detail === `syllable:${vowel.syllableIndex}` &&
      repair.before.endsWith("yet") && repair.after === `${repair.before.slice(0, -3)}yte`);
    if (consonantalYMagicE) {
      pairAdd("exploratory:consonantalYMagicE");
      const witnesses = probe.witnesses["exploratory:consonantalYMagicE"] ??= [];
      if (witnesses.length < 3) witnesses.push({ word, location });
    }
    pairAdd(`selected:${vowel.selected}`);
    pairAdd(`emitted:${vowel.emitted}`);
    pairAdd(`followingSelected:${next.selected}`);
    if (vowel.afterCondition.includes("e")) pairAdd("eAfterCondition");
    if (vowel.afterPosition.includes("e")) pairAdd("eAfterPosition");
    if (!vowel.weights.some(([form, weight]) => form === vowel.selected && Number.isFinite(weight) && weight > 0)) pairAdd("nonpositiveTracedSelection");
    pairAdd(`weightSet:${JSON.stringify(vowel.weights)}`);
    let changed = "unknown";
    if (orthography) {
      const vowelLetters = ownedLetters(orthography, vowel.index);
      const nextLetters = ownedLetters(orthography, next.index);
      pairAdd("baseOwnershipPairs");
      pairAdd(`survivingVowel:${vowelLetters}`);
      pairAdd(`survivingFollowing:${nextLetters}`);
      changed = vowelLetters !== vowel.emitted || nextLetters !== next.emitted ? "changed" : "unchanged";
      pairAdd(`ownedLetters:${changed}`);
      for (const pattern of ["ea", "eat"]) {
        const contribution = ownedOccurrences(orthography, pattern, vowel.index, next.index);
        pairAdd(`ownedBase:${pattern}`, contribution);
        if (finalAligned) pairAdd(`ownedFinal:${pattern}`, contribution);
      }
    } else pairAdd("unknownBaseOwnershipPairs");
    pairAdd(finalAligned ? "finalOwnershipPairs" : "unknownFinalOwnershipPairs");
    const witnessKey = `${boundary}/${position}/${vowel.selected}/${changed}`;
    const witnesses = probe.witnesses[witnessKey] ??= [];
    if (witnesses.length < 3) witnesses.push({ word, location });
  }
  if (!eligibleWord) return;
  add(count, "eligibleWords");
  const stringRepairs = trace.repairs.filter(repair => isStringRepair(repair.rule));
  if (stringRepairs.length) add(count, "eligibleWordsWithStringRepairs");
  for (const repair of stringRepairs) {
    const repairs = probe.repairs[repair.rule] ??= {};
    add(repairs, "events");
    for (const pattern of ["ea", "eat"]) {
      add(repairs, `before:${pattern}`, occurrences(repair.before, pattern));
      add(repairs, `after:${pattern}`, occurrences(repair.after, pattern));
    }
  }
}

const hash = (text: string | Buffer) => createHash("sha256").update(text).digest("hex");
interface Artifact { file: string; sha256: string; bytes: number }
interface Manifest {
  schemaVersion: number;
  cohort: "development";
  protocolDigest: string;
  protocol: {
    wordsPerReplicate: number;
    profiles: Array<{ id: string; seeds: { development: number[] } }>;
  };
  artifacts: Artifact[];
}
export interface ManifestEnvelope { manifest: Manifest; digest: string }
interface Stream { profile: string; seed: number; artifact: Artifact }

// Manifests contain JSON only; this matches the frozen benchmark's sorted-key hash.
function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, item]) => [key, canonicalJson(item)]));
  }
  return value;
}
export const jsonDigest = (value: unknown): string => hash(JSON.stringify(canonicalJson(value)));

export function archiveSchedule(envelope: ManifestEnvelope): Stream[] {
  const { manifest } = envelope;
  if (manifest.schemaVersion !== 1 || manifest.cohort !== "development" ||
      jsonDigest(manifest) !== envelope.digest || jsonDigest(manifest.protocol) !== manifest.protocolDigest ||
      !Number.isInteger(manifest.protocol.wordsPerReplicate) || manifest.protocol.wordsPerReplicate < 1) {
    throw new Error("Invalid or altered development manifest.");
  }
  const artifacts = new Map(manifest.artifacts.map(artifact => [artifact.file, artifact]));
  if (artifacts.size !== manifest.artifacts.length) throw new Error("Duplicate artifact paths.");
  const streams: Stream[] = [];
  for (const profile of manifest.protocol.profiles) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(profile.id)) throw new Error("Invalid profile ID.");
    for (const seed of profile.seeds.development) {
      if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error("Invalid stream seed.");
      const file = `words/${profile.id}-${seed}.jsonl.gz`;
      const artifact = artifacts.get(file);
      if (!artifact) throw new Error(`Missing scheduled artifact: ${file}`);
      streams.push({ profile: profile.id, seed, artifact });
    }
  }
  const expected = new Set(streams.map(stream => stream.artifact.file));
  const listed = manifest.artifacts.filter(artifact => artifact.file.startsWith("words/"));
  if (!streams.length || expected.size !== streams.length || listed.length !== expected.size || listed.some(artifact => !expected.has(artifact.file))) {
    throw new Error("Archive shards do not match the stream schedule.");
  }
  return streams.sort((a, b) => a.artifact.file.localeCompare(b.artifact.file, "en"));
}

export function verifyShard(bytes: Buffer, artifact: Artifact): void {
  if (bytes.length !== artifact.bytes || hash(bytes) !== artifact.sha256) throw new Error(`Artifact verification failed: ${artifact.file}`);
}

export function validateDraw(draw: Location, stream: Pick<Stream, "profile" | "seed">, index: number): void {
  if (draw.profile !== stream.profile || draw.seed !== stream.seed || draw.drawIndex !== index) throw new Error("Archive draw does not match the expected stream coordinate.");
}

async function main(run: string): Promise<void> {
  const directory = join(run, "words");
  const manifestText = await readFile(join(run, "manifest.json"), "utf8");
  const envelope = JSON.parse(manifestText) as ManifestEnvelope;
  const streams = archiveSchedule(envelope);
  const expectedNames = streams.map(stream => stream.artifact.file.slice("words/".length)).sort();
  const actualNames = (await readdir(directory)).filter(name => name.endsWith(".jsonl.gz")).sort();
  if (JSON.stringify(expectedNames) !== JSON.stringify(actualNames)) throw new Error("Word directory contains missing or unlisted shards.");
  const total = emptyProbe();
  const replicates: Record<string, Omit<EtProbe, "witnesses">> = {};
  for (const stream of streams) {
    const bytes = await readFile(join(run, stream.artifact.file));
    verifyShard(bytes, stream.artifact);
    const probe = emptyProbe();
    // Parse the exact verified bytes, avoiding a second read of a mutable file.
    const lines = createInterface({ input: Readable.from(bytes).pipe(createGunzip()), crlfDelay: Infinity });
    let index = 0;
    for await (const line of lines) {
      const draw = JSON.parse(line) as Location & { word: Word };
      validateDraw(draw, stream, index++);
      const location = { profile: draw.profile, seed: draw.seed, drawIndex: draw.drawIndex };
      observeWord(probe, draw.word, location);
      observeWord(total, draw.word, location);
    }
    if (index !== envelope.manifest.protocol.wordsPerReplicate) throw new Error(`Incomplete stream: ${stream.artifact.file}`);
    replicates[stream.artifact.file.slice("words/".length)] = { counts: probe.counts, strata: probe.strata, repairs: probe.repairs };
  }
  if (!total.counts.words) throw new Error("No archived words found.");
  const source = await readFile(fileURLToPath(import.meta.url), "utf8");
  const registration = await readFile(join(dirname(fileURLToPath(import.meta.url)), "README.md"), "utf8");
  process.stdout.write(`${JSON.stringify({ probeVersion: 1, run, manifestDigest: hash(manifestText), protocolDigest: envelope.manifest.protocolDigest, verifiedStreams: streams.length, evaluatorDigest: hash(source + registration), total, replicates }, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error("Usage: node --import tsx evaluation/quality/probes/ordinary-et/analyze.ts RUN_DIRECTORY");
  await main(resolve(process.argv[2]));
}
