import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { gunzipSync, gzipSync } from "node:zlib";
import { parseCmuPhone, type CmuPhone, type SelectedCmuEntry } from "./cmu.js";
import { jsonDigest } from "./identity.js";
import type { LedgerRow } from "./root-stripping.js";

const phaseOneRevision = "0de88f5cd4ab51fe2485e38698ca8f528f804a34";
const phaseOneDigest = "2eacf788dd396e5207908c613d6689390e462d0488fa6e847606e08c124ce467";
const corpusDirectory = fileURLToPath(new URL("./", import.meta.url));
type Stress = Extract<CmuPhone, { kind: "vowel" }>["stress"];
type Slot = "initial-CC" | "initial-CV" | "medial-VC" | "medial-CC" | "medial-CV" | "hiatus-VV" | "final-VC" | "final-CC";

interface Pair {
  slot: Slot;
  left: string;
  right: string;
  /** Nearest vowel at or before the left phone, and at or after the right phone. */
  leftStress: Stress | null;
  rightStress: Stress | null;
}

interface PopulationCounts { distinctStems: number; surfaceObservations: number }
interface PairCounts { stemWeightedOccurrences: number; surfaceWeightedOccurrences: number }
interface RootPopulation {
  roots: readonly Pick<SelectedCmuEntry, "spelling" | "tokens">[];
  ledger: readonly Pick<LedgerRow, "status" | "stem">[];
}
interface PhaseOneArtifact extends RootPopulation {
  sources: Record<"cmu" | "scowl" | "wordnet", { url: string; sha256: string; license: string; revision?: string; version?: string }>;
  implementation: Array<{ path: string; sha256: string }>;
}
type Audit = Readonly<Record<string, readonly string[]>>;
interface WeightedRoot { phones: readonly CmuPhone[]; surfaceWeight: number }

function slotOf(left: CmuPhone, right: CmuPhone, leftStress: Stress | null, rightStress: Stress | null): Slot {
  if (leftStress === null) return right.kind === "vowel" ? "initial-CV" : "initial-CC";
  if (rightStress === null) return left.kind === "vowel" ? "final-VC" : "final-CC";
  if (left.kind === "vowel") return right.kind === "vowel" ? "hiatus-VV" : "medial-VC";
  return right.kind === "vowel" ? "medial-CV" : "medial-CC";
}

/** The eight slots use only vowel locations, independent of medial syllabification. */
function* rootPairs(phones: readonly CmuPhone[]): Generator<Pair> {
  const stresses = phones.flatMap(phone => phone.kind === "vowel" ? [phone.stress] : []);
  if (!stresses.length) throw new Error("An audited root needs a vowel with CMU stress.");
  let vowelsPassed = 0;
  for (let i = 0; i + 1 < phones.length; i++) {
    const left = phones[i], right = phones[i + 1];
    if (left.kind === "vowel") vowelsPassed++;
    const leftStress = stresses[vowelsPassed - 1] ?? null;
    const rightStress = stresses[vowelsPassed] ?? null;
    yield { slot: slotOf(left, right, leftStress, rightStress), left: left.base, right: right.base, leftStress, rightStress };
  }
}

function finalCoda(phones: readonly CmuPhone[], projection: Readonly<Record<string, string>>): string {
  let index = phones.length;
  while (index > 0 && phones[index - 1].kind === "consonant") index--;
  return phones.slice(index).map(phone => {
    if (!projection[phone.base]) throw new Error(`Missing coda audit projection for ${phone.base}.`);
    return projection[phone.base];
  }).join(" ");
}

/** Count each adjacent occurrence once per stem and once per included surface spelling resolving to that stem. */
export function countAuditedRootPairs(population: RootPopulation, audit: Audit, projection: Readonly<Record<string, string>>) {
  const weights = new Map<string, number>();
  for (const row of population.ledger) {
    if (row.status !== "included") continue;
    if (!row.stem) throw new Error("Included surface is missing its terminal stem.");
    weights.set(row.stem, (weights.get(row.stem) ?? 0) + 1);
  }
  const excluded = new Map<string, string>();
  for (const [coda, spellings] of Object.entries(audit)) {
    for (const spelling of spellings) {
      if (excluded.has(spelling)) throw new Error(`Duplicate audit entry for ${spelling}.`);
      excluded.set(spelling, coda);
    }
  }
  const roots: WeightedRoot[] = [];
  const removed: PopulationCounts = { distinctStems: 0, surfaceObservations: 0 };
  for (const { spelling, tokens } of population.roots) {
    const weight = weights.get(spelling);
    if (!weight) throw new Error(`Unrepresented or duplicate terminal stem: ${spelling}`);
    weights.delete(spelling);
    const phones = tokens.map(token => {
      const phone = parseCmuPhone(token);
      if (!phone) throw new Error(`Unsupported CMU phone in ${spelling}: ${token}`);
      return phone;
    });
    if (excluded.has(spelling)) {
      if (excluded.get(spelling) !== finalCoda(phones, projection)) throw new Error(`Coda audit mismatch for ${spelling}.`);
      excluded.delete(spelling);
      removed.distinctStems++;
      removed.surfaceObservations += weight;
      continue;
    }
    roots.push({ phones, surfaceWeight: weight });
  }
  if (weights.size || excluded.size) throw new Error("A ledger or coda audit stem is missing from the root inventory.");
  const { retained, pairTotals, rows } = countRetainedRootPairs(roots);
  return { retained, removed, pairTotals, rows };
}

export function countRetainedRootPairs(roots: Iterable<WeightedRoot>) {
  const retained: PopulationCounts = { distinctStems: 0, surfaceObservations: 0 };
  const pairTotals: PairCounts = { stemWeightedOccurrences: 0, surfaceWeightedOccurrences: 0 };
  const counts = new Map<string, Pair & PairCounts>();
  for (const { phones, surfaceWeight: weight } of roots) {
    if (!Number.isSafeInteger(weight) || weight < 1) throw new Error("A retained root needs a positive surface weight.");
    retained.distinctStems++;
    retained.surfaceObservations += weight;
    pairTotals.stemWeightedOccurrences += phones.length - 1;
    pairTotals.surfaceWeightedOccurrences += (phones.length - 1) * weight;
    for (const pair of rootPairs(phones)) {
      const key = JSON.stringify([pair.slot, pair.left, pair.right, pair.leftStress, pair.rightStress]);
      const row = counts.get(key) ?? { ...pair, stemWeightedOccurrences: 0, surfaceWeightedOccurrences: 0 };
      row.stemWeightedOccurrences++;
      row.surfaceWeightedOccurrences += weight;
      counts.set(key, row);
    }
  }
  const rows = Array.from(counts.keys()).sort().map(key => counts.get(key)!);
  for (const unit of ["stemWeightedOccurrences", "surfaceWeightedOccurrences"] as const) {
    if (rows.reduce((sum, row) => sum + row[unit], 0) !== pairTotals[unit]) throw new Error(`Unaccounted root pairs for ${unit}.`);
  }
  return { retained, pairTotals, rows };
}

export async function loadPinnedRootPairCensus() {
  const bytes = await readFile(resolve(corpusDirectory, "uci-root-pairs-v2.json.gz"));
  const { digest, reference }: Awaited<ReturnType<typeof buildRootPairReference>> = JSON.parse(gunzipSync(bytes).toString("utf8"));
  if (digest !== "06f1b3e75ce4dc49b8f081d193eceb9e1580354034e8bd3f271f9d70692cfe8d" || jsonDigest(reference) !== digest) {
    throw new Error("Unexpected audited UCI root-pair census digest.");
  }
  return reference;
}

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

export async function buildRootPairReference(rootReference: string) {
  const [ledger, audit, projection, pins] = await Promise.all([
    readFile(rootReference, "utf8"), readFile(resolve(corpusDirectory, "root-coda-exclusions.json")),
    readFile(resolve(corpusDirectory, "../../data/cmu/phoneme-normalization.json")),
    readFile(resolve(corpusDirectory, "stage-reference-pins.json"), "utf8"),
  ]);
  const { digest, artifact }: { digest: string; artifact: PhaseOneArtifact } = JSON.parse(ledger);
  if (digest !== phaseOneDigest || jsonDigest(artifact) !== phaseOneDigest) throw new Error("Expected the verified Phase 1 root ledger from 0de88f5c.");
  const auditDigest = sha256(audit), projectionDigest = sha256(projection);
  if (auditDigest !== JSON.parse(pins)["evaluation/corpus/root-coda-exclusions.json"]) throw new Error("Coda audit digest mismatch.");
  const sourceProjection = artifact.implementation.find(input => input.path === "data/cmu/phoneme-normalization.json");
  if (projectionDigest !== sourceProjection?.sha256) throw new Error("Phase 1 coda projection digest mismatch.");
  const counts = countAuditedRootPairs(artifact, JSON.parse(audit.toString()), JSON.parse(projection.toString()).arpabetToIpa);
  const reference = {
    version: "cmu-audited-root-pairs-v2",
    slotPolicy: "nearest-flanking-vowels-v1",
    provenance: { phaseOneRevision, phaseOneDigest, sources: artifact.sources, auditDigest, projectionDigest },
    ...counts,
  };
  return { digest: jsonDigest(reference), reference };
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { "root-reference": { type: "string" }, out: { type: "string" } } });
  if (!values["root-reference"] || !values.out) throw new Error("Use --root-reference PHASE1.json --out NEW_REFERENCE.json.gz");
  const envelope = await buildRootPairReference(values["root-reference"]);
  await writeFile(values.out, gzipSync(`${JSON.stringify(envelope)}\n`, { level: 9 }), { flag: "wx" });
  const { retained, removed, pairTotals } = envelope.reference;
  console.log(JSON.stringify({ digest: envelope.digest, retained, removed, pairTotals }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
