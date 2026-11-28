import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
import { CMU_COMPATIBILITY_POLICY, CMU_PARSER_VERSION, CONSONANTS, VOWELS, parseCmuRecords, selectCompatibleCmu } from "../../corpus/cmu.js";
import { CMU_REVISION, CMU_SHA256 } from "../../review/wordlikeness/model.js";
import { type ObservedWordInput, PHONEME_IDENTITY_CONTRACT, observeWordIdentity, projectLegacyArpabet } from "../../../src/phonology/identity.js";
import { digest } from "../serialization.js";
import { fitMembership, fitPhoneTrigram } from "./guide.js";
import { fitUci, type ReferenceDescriptor } from "./scorer.js";

export const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const artifactFile = "ordinary-surface-phones.txt.gz";
const pinFile = "reference.json";
const dataDirectory = resolve(ROOT, "evaluation/quality/uci/data");
const spellingPath = resolve(ROOT, "data/cmu/ordinary/spellings.txt");
const spellingSha256 = "9b61f2af444a2177d3cac89464d81e39970ef65a0fab54b3a18465a5dc6c5f3b";

export const sha256 = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");

function descriptor(rowsSha256: string): ReferenceDescriptor {
  return {
    schemaVersion: 1,
    id: "cmu-ordinary-surface-v1",
    sampling: "one vote for each ordinary spelling, in ordinary spellings.txt order; retain homophones",
    projection: "CMU unstressed ARPABET aligned with generated surface legacy-arpabet-v1 (no boundaries)",
    fold: { algorithm: "sha256-first-u64be-mod", encoding: "space-separated-ascii-uppercase-v1", count: 5 },
    provenance: {
      cmuRevision: CMU_REVISION, cmuSha256: CMU_SHA256, ordinarySpellingsSha256: spellingSha256,
      cmuParser: CMU_PARSER_VERSION, cmuSelection: CMU_COMPATIBILITY_POLICY,
      generatedIdentity: PHONEME_IDENTITY_CONTRACT.version, generatedInventory: PHONEME_IDENTITY_CONTRACT.inventory,
      rowsSha256, rowsEncoding: "UTF-8, one space-delimited phone sequence per spelling, LF-terminated",
      cmuLicense: "data/cmu/ordinary/CMUDICT-LICENSE.txt",
      scowlLicense: "data/cmu/ordinary/SCOWL-LICENSE.txt",
    },
  };
}

async function readSpellings(): Promise<string[]> {
  const bytes = await readFile(spellingPath);
  if (sha256(bytes) !== spellingSha256) throw new Error("Ordinary spellings do not match the pinned SHA-256.");
  const spellings = bytes.toString("utf8").trimEnd().split("\n");
  if (spellings.length !== 45904) throw new Error("Unexpected ordinary spelling census.");
  return spellings;
}

function referencePin(raw: Buffer) {
  const value = descriptor(sha256(raw));
  return { descriptor: value, descriptorSha256: digest(value) };
}

function serializePin(pin: ReturnType<typeof referencePin>): string {
  return `${JSON.stringify(pin, null, 2)}\n`;
}

export async function buildReference(dictionary: string, out?: string) {
  const [source, spellings] = await Promise.all([readFile(dictionary), readSpellings()]);
  if (sha256(source) !== CMU_SHA256) throw new Error("CMUdict does not match the pinned SHA-256.");
  const { entries } = selectCompatibleCmu(parseCmuRecords(source.toString("utf8")));
  const bySpelling = new Map(entries.map(entry => [entry.spelling, entry.phones]));
  const lines = spellings.map(spelling => {
    const phones = bySpelling.get(spelling);
    if (!phones) throw new Error(`Missing compatible pronunciation for ${spelling}.`);
    return phones.map(phone => phone.base).join(" ");
  });
  const raw = Buffer.from(`${lines.join("\n")}\n`);
  const pin = referencePin(raw);
  if (out === undefined) {
    const current = await loadReference();
    if (current.descriptorSha256 !== pin.descriptorSha256) throw new Error("Rebuilt UCI reference differs from the shipped reference.");
  } else {
    await mkdir(out);
    await writeFile(join(out, artifactFile), gzipSync(raw), { flag: "wx" });
    await writeFile(join(out, pinFile), serializePin(pin), { flag: "wx" });
  }
  return pin;
}

export async function loadReference() {
  const [compressed, savedPin, spellings] = await Promise.all([
    readFile(join(dataDirectory, artifactFile)), readFile(join(dataDirectory, pinFile), "utf8"), readSpellings(),
  ]);
  const raw = gunzipSync(compressed);
  const pin = referencePin(raw);
  if (savedPin !== serializePin(pin)) throw new Error("UCI reference does not match the pinned descriptor or row digest.");
  const rows = raw.toString("utf8").trimEnd().split("\n").map(line => line.split(" "));
  if (rows.length !== spellings.length || rows.some(row =>
    row.some(token => !CONSONANTS.has(token) && !VOWELS.has(token)) || !row.some(token => VOWELS.has(token)))) {
    throw new Error("Invalid phoneme rows in UCI reference.");
  }
  return { ...pin, spellings, rows };
}

export async function loadSurfaceScorer() {
  const { descriptor, descriptorSha256, rows, spellings } = await loadReference();
  return {
    descriptor, descriptorSha256, scorer: fitUci(descriptor, rows),
    trigram: fitPhoneTrigram(descriptor, rows), membership: fitMembership(rows, spellings),
  };
}

export type SurfaceProjection =
  | { kind: "projected"; phones: string[] }
  | { kind: "ineligible"; reason: "unmapped-phones" | "empty-surface"; phones: Array<string | null>; unmapped: Array<{ index: number; sound: string }> };

export function projectSurface(word: ObservedWordInput): SurfaceProjection {
  const observed = observeWordIdentity(word, { sourceProfile: "english-legacy-v1", layer: "surface" });
  const projection = projectLegacyArpabet(observed);
  const phones = projection.items.map(item => item.token);
  if (!phones.length) return { kind: "ineligible", reason: "empty-surface", phones, unmapped: [] };
  if (phones.every((token): token is string => token !== null)) return { kind: "projected", phones };
  const unmapped = projection.items.flatMap(({ sourceIndex, token }) =>
    token === null ? [{ index: sourceIndex, sound: observed.segments[sourceIndex].rawSound }] : []);
  return { kind: "ineligible", reason: "unmapped-phones", phones, unmapped };
}
