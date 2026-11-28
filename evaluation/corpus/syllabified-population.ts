import { readFile } from "node:fs/promises";
import { CMU_SHA256, sha256 } from "../review/wordlikeness/model.js";
import { CMU_COMPATIBILITY_POLICY, parseCmuRecords, selectCompatibleCmu, type SelectedCmuEntry } from "./cmu.js";
import { jsonDigest } from "./identity.js";
import { JOINT_ENTRY_DIGEST } from "./joint.js";

export const X5_POPULATION = {
  phaseOne: "2eacf788dd396e5207908c613d6689390e462d0488fa6e847606e08c124ce467",
  codaAudit: "e8076811e7dd4a7a1a47daec6fd60284ee7bdd984e5765fb93cadd4c4ff08dbd",
  codaProjection: "60ffe6783768e66abeaaca798f8da0c1c0d291505bd5798c0641f938e0d495ba",
  cmu: CMU_SHA256, selection: CMU_COMPATIBILITY_POLICY, selectedEntryDigest: JOINT_ENTRY_DIGEST,
  surfaceObservations: 42_670, distinctStems: 20_851,
} as const;

interface RootSource {
  line: number;
  label: string;
  spelling: string;
  tokens: string[];
}
interface SurfaceSource { line: number; spelling: string; stem: string }
export interface RootObservation {
  source: SelectedCmuEntry;
  surfaces: SurfaceSource[];
}

export function checkTextPin(text: string, digest: string, description: string) {
  if (sha256(text) !== digest) throw new Error(`Unexpected ${description} digest.`);
}

function hasRootSource(row: unknown): row is RootSource {
  return row !== null && typeof row === "object" && "line" in row && Number.isInteger(row.line)
    && "label" in row && typeof row.label === "string" && "spelling" in row && typeof row.spelling === "string"
    && "tokens" in row && Array.isArray(row.tokens) && row.tokens.every(token => typeof token === "string");
}
function hasSurfaceSource(row: unknown): row is SurfaceSource {
  return row !== null && typeof row === "object" && "line" in row && Number.isInteger(row.line)
    && "spelling" in row && typeof row.spelling === "string" && "stem" in row && typeof row.stem === "string";
}
function includedSurfaces(ledger: readonly unknown[]): SurfaceSource[] {
  return ledger.flatMap(row => {
    if (!row || typeof row !== "object" || !("status" in row)) throw new Error("Invalid Phase 1 ledger row.");
    if (row.status !== "included") return [];
    if (!hasSurfaceSource(row)) throw new Error("Invalid included Phase 1 row.");
    return [{ line: row.line, spelling: row.spelling, stem: row.stem }];
  });
}

export function phaseOneRows(text: string) {
  const envelope: unknown = JSON.parse(text);
  if (!envelope || typeof envelope !== "object" || !("digest" in envelope) || envelope.digest !== X5_POPULATION.phaseOne
    || !("artifact" in envelope) || jsonDigest(envelope.artifact) !== X5_POPULATION.phaseOne) {
    throw new Error("Unexpected Phase 1 ledger digest.");
  }
  const { artifact } = envelope;
  if (!artifact || typeof artifact !== "object" || !("roots" in artifact) || !Array.isArray(artifact.roots)
    || !artifact.roots.every(hasRootSource) || !("ledger" in artifact) || !Array.isArray(artifact.ledger)) {
    throw new Error("Phase 1 ledger has an invalid shape.");
  }
  return { roots: artifact.roots, surfaces: includedSurfaces(artifact.ledger) };
}

function readStringLists(text: string): Array<[string, string[]]> {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a mapping.");
  return Object.entries(value).map(([key, items]) => {
    if (!Array.isArray(items) || !items.every(item => typeof item === "string")) throw new Error(`Invalid list: ${key}`);
    return [key, items];
  });
}

function readIpa(text: string): Map<string, string> {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object" || !("arpabetToIpa" in value)
    || !value.arpabetToIpa || typeof value.arpabetToIpa !== "object") throw new Error("Missing coda audit projection.");
  return new Map(Object.entries(value.arpabetToIpa).map(([token, sound]) => {
    if (typeof sound !== "string") throw new Error(`Invalid coda audit projection: ${token}`);
    return [token, sound];
  }));
}

function auditableCoda(source: SelectedCmuEntry, ipa: ReadonlyMap<string, string>) {
  const afterFinalVowel = source.phones.length - [...source.phones].reverse().findIndex(phone => phone.kind === "vowel");
  return source.phones.slice(afterFinalVowel).map(phone => {
    const sound = ipa.get(phone.base);
    if (!sound) throw new Error(`Unknown audit phone: ${phone.raw}`);
    return sound;
  }).join(" ");
}

export async function loadAuditedPopulation(paths: { source: string; phaseOne: string; audit: string; projection: string }) {
  const [sourceText, phaseOneText, auditText, projectionText] = await Promise.all(
    [paths.source, paths.phaseOne, paths.audit, paths.projection].map(path => readFile(path, "utf8")),
  );
  checkTextPin(sourceText, X5_POPULATION.cmu, "CMU source");
  checkTextPin(auditText, X5_POPULATION.codaAudit, "root coda audit");
  checkTextPin(projectionText, X5_POPULATION.codaProjection, "coda audit projection");
  const { entries } = selectCompatibleCmu(parseCmuRecords(sourceText));
  const identities = entries.map(({ line, label, spelling, tokens }) => ({ line, label, spelling, tokens }));
  if (sha256(JSON.stringify(identities)) !== X5_POPULATION.selectedEntryDigest) {
    throw new Error("Unexpected #304-compatible population.");
  }
  const bySpelling = new Map(entries.map(entry => [entry.spelling, entry]));
  const phaseOne = phaseOneRows(phaseOneText);
  const rootSources = new Map<string, SelectedCmuEntry>();
  for (const root of phaseOne.roots) {
    const source = bySpelling.get(root.spelling);
    if (!source || source.line !== root.line || source.label !== root.label || source.tokens.join(" ") !== root.tokens.join(" ")) {
      throw new Error(`Phase 1 root does not match its native CMU row: ${root.spelling}`);
    }
    rootSources.set(root.spelling, source);
  }
  const excluded = new Set<string>();
  const ipa = readIpa(projectionText);
  for (const [coda, stems] of readStringLists(auditText)) {
    for (const stem of stems) {
      const source = rootSources.get(stem);
      if (!source || excluded.has(stem) || auditableCoda(source, ipa) !== coda) throw new Error(`Invalid coda exclusion: ${stem}`);
      excluded.add(stem);
    }
  }
  const roots = new Map<string, RootObservation>();
  let surfaces = 0;
  for (const surface of phaseOne.surfaces) {
    if (excluded.has(surface.stem)) continue;
    const source = rootSources.get(surface.stem);
    if (!source || bySpelling.get(surface.spelling)?.line !== surface.line) throw new Error(`Invalid Phase 1 surface: ${surface.spelling}`);
    const observation = roots.get(surface.stem) ?? { source, surfaces: [] };
    observation.surfaces.push(surface);
    roots.set(surface.stem, observation);
    surfaces++;
  }
  if (surfaces !== X5_POPULATION.surfaceObservations || roots.size !== X5_POPULATION.distinctStems) {
    throw new Error(`Unexpected audited population: ${surfaces} surfaces and ${roots.size} stems.`);
  }
  return { entries, roots: [...roots.values()].sort((a, b) => a.source.line - b.source.line) };
}
