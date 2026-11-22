// Regenerate src/config/lexicon-reference.ts from the independently verified Phase 1 ledger.
import { readFileSync, writeFileSync } from "node:fs";
import { CMU_SHA256, sha256 } from "../review/wordlikeness/model.js";
import { parseCmuRecords, selectCompatibleCmu, type SelectedCmuEntry } from "./cmu.js";
import { jsonDigest } from "./identity.js";
import { JOINT_ENTRY_DIGEST } from "./joint.js";
import projection from "../../data/cmu/phoneme-normalization.json";
import type { MorphologyTemplate } from "../../src/types.js";

type Counts = Record<string, number>;
const add = (counts: Counts, key: string | number) => { counts[key] = (counts[key] ?? 0) + 1; };
const numericPairs = (counts: Counts): [number, number][] => Object.entries(counts).map(([value, count]) => [Number(value), count]);
const syllables = ({ phones }: SelectedCmuEntry) => phones.filter(phone => phone.kind === "vowel").length;
const ipa = new Map(Object.entries(projection.arpabetToIpa));
const sound = ({ base }: SelectedCmuEntry["phones"][number]) => {
  const mapped = ipa.get(base);
  if (!mapped) throw new Error(`Missing projection for ${base}`);
  return mapped;
};
function codaLength({ phones }: SelectedCmuEntry): number {
  let start = phones.length;
  while (phones[start - 1].kind === "consonant") start--;
  return phones.length - start;
}

const emptyTemplates = () => ({ bare: 0, suffixed: 0, prefixed: 0, both: 0 });
const isTemplate = (value: unknown): value is MorphologyTemplate =>
  value === "bare" || value === "suffixed" || value === "prefixed" || value === "both";

function population() {
  const phones: Counts = {}, syllableCounts: Counts = {}, phoneLengths: Counts = {}, codas: Counts = {};
  let vowelInitial = 0, vowelInitialSpelling = 0, longSpelling = 0;
  return {
    add(entry: SelectedCmuEntry) {
      const sounds = entry.phones.map(sound);
      add(codas, sounds.slice(sounds.length - codaLength(entry)).join(","));
      add(syllableCounts, syllables(entry));
      add(phoneLengths, sounds.length);
      sounds.forEach(phone => add(phones, phone));
      if (entry.phones[0].kind === "vowel") vowelInitial++;
      if (/^[aeiou]/.test(entry.spelling)) vowelInitialSpelling++;
      if (entry.spelling.length >= 14) longSpelling++;
    },
    summarize: () => ({
      phones, syllables: syllableCounts, phoneLengths, codas, vowelInitial, vowelInitialSpelling, longSpelling,
    }),
  };
}

function derive(ledger: unknown[], entries: SelectedCmuEntry[]) {
  const bySpelling = new Map(entries.map(entry => [entry.spelling, entry]));
  const roots = population(), common = population(), representable = population();
  const syllablesByPhoneLength: Record<number, Counts> = {};
  const codaLengthsByShape: Record<string, Counts> = {};
  const templates = emptyTemplates();
  const templatesByRootSyllables: Record<number, ReturnType<typeof emptyTemplates>> = {};
  const affixes = { prefix: {} as Counts, suffix: {} as Counts };
  const additionalSyllables: Record<string, Counts> = {};
  let suffixedClusterRoots = 0;
  if (ledger.length !== entries.length) throw new Error("Ledger coverage differs from the pinned CMU selection.");

  for (const [index, row] of ledger.entries()) {
    const surface = entries[index];
    if (row === null || typeof row !== "object" || !("spelling" in row) || row.spelling !== surface.spelling ||
        !("line" in row) || row.line !== surface.line || !("status" in row) || !("stem" in row)) {
      throw new Error(`Invalid ledger row for ${surface.spelling}`);
    }
    if (row.stem !== null) common.add(surface);
    if (row.status !== "included") continue;
    if (typeof row.stem !== "string" || !("template" in row) || !isTemplate(row.template) ||
        !("steps" in row) || !Array.isArray(row.steps)) throw new Error(`Invalid included row: ${surface.spelling}`);
    const root = bySpelling.get(row.stem);
    if (!root) throw new Error(`Missing root: ${row.stem}`);
    const count = syllables(root);
    const length = root.phones.length;
    const finalLength = codaLength(root);
    roots.add(root);
    representable.add(surface);
    add(syllablesByPhoneLength[length] ??= {}, count);
    add(codaLengthsByShape[`${length}:${count}`] ??= {}, finalLength);
    templates[row.template]++;
    (templatesByRootSyllables[count] ??= emptyTemplates())[row.template]++;
    add(additionalSyllables[`${count}:${row.template}`] ??= {}, syllables(surface) - count);
    if (finalLength >= 2 && ["S", "Z"].includes(root.phones[length - 1].base) &&
        (row.template === "both" || row.template === "suffixed")) suffixedClusterRoots++;
    for (const step of row.steps) {
      if (!step || (step.type !== "prefix" && step.type !== "suffix") || typeof step.affix !== "string") {
        throw new Error(`Invalid affix step: ${surface.spelling}`);
      }
      add(step.type === "prefix" ? affixes.prefix : affixes.suffix, step.affix);
    }
  }

  const root = roots.summarize();
  return {
    phonemeLengths: numericPairs(root.phoneLengths),
    syllablesByPhoneLength: Object.fromEntries(Object.entries(syllablesByPhoneLength).map(([length, counts]) =>
      [length, numericPairs(counts)])),
    codaLengthsByShape: Object.fromEntries(Object.entries(codaLengthsByShape).sort().map(([shape, counts]) =>
      [shape, numericPairs(counts)])),
    templates, templatesByRootSyllables, affixes, additionalSyllables, suffixedClusterRoots,
    root, representable: representable.summarize(), common: common.summarize(),
  };
}

const [artifactPath, cmuPath, out] = process.argv.slice(2);
if (!artifactPath || !cmuPath || !out) {
  throw new Error("Usage: lexicon-calibration.ts <verified root artifact> <pinned cmudict.dict> <new output path>");
}
const cmu = readFileSync(cmuPath, "utf8");
if (sha256(cmu) !== CMU_SHA256) throw new Error("CMU source digest mismatch.");
const { entries } = selectCompatibleCmu(parseCmuRecords(cmu));
const identities = entries.map(({ line, label, spelling, tokens }) => ({ line, label, spelling, tokens }));
if (sha256(JSON.stringify(identities)) !== JOINT_ENTRY_DIGEST) throw new Error("CMU selection mismatch.");

const envelope: unknown = JSON.parse(readFileSync(artifactPath, "utf8"));
if (envelope === null || typeof envelope !== "object" || !("digest" in envelope) || !("artifact" in envelope)) {
  throw new Error("Invalid root reference envelope.");
}
const { artifact, digest } = envelope;
if (artifact === null || typeof artifact !== "object" || !("version" in artifact) ||
    artifact.version !== "cmu-common-root-reference-v1" || !("ledger" in artifact) || !Array.isArray(artifact.ledger) ||
    jsonDigest(artifact) !== digest) throw new Error("Invalid root reference version, ledger, or digest.");

const tables = derive(artifact.ledger, entries);
const weightTypes: Record<string, string> = {
  phonemeLengths: "[number, number][]",
  syllablesByPhoneLength: "Record<number, [number, number][]>",
  codaLengthsByShape: "Record<string, [number, number][]>",
};
const data = Object.entries(tables).map(([key, value]) =>
  `  ${key}: ${JSON.stringify(value)}${weightTypes[key] ? ` satisfies ${weightTypes[key]}` : ""},`).join("\n");
writeFileSync(out, `// Generated by evaluation/corpus/lexicon-calibration.ts.\n// Phase 1 ledger digest: ${jsonDigest(artifact.ledger)}\nexport const lexiconReference = {\n${data}\n};\n`, { flag: "wx" });
