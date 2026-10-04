import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { digest } from "../../quality/serialization.js";
import type { IdentityStressReference, PhoneTransitionTable } from "../../../src/phonology/identity-stress-score.js";

export interface ReferencePin {
  artifactFileSha256: string;
  artifactDigest: string;
  sourceSha256: string;
  selectedEntryDigest: string;
  entries: number;
  eventsPerView: number;
}

interface ArtifactEnvelope {
  digest: string;
  artifact: {
    source: { sha256: string };
    population: { accepted: number; entryDigest: string };
    transitions: { entries: number; phoneEvents: number; entryDigest: string; native: PhoneTransitionTable; base: PhoneTransitionTable };
  };
}

/** Authentication belongs at the file boundary; the pure scorer validates declared tables. */
export async function loadPinnedReference(path: string, expected: ReferencePin): Promise<IdentityStressReference> {
  const bytes = await readFile(path);
  const envelope = JSON.parse(gunzipSync(bytes).toString("utf8")) as ArtifactEnvelope;
  const artifact = envelope.artifact;
  const actual = {
    artifactFileSha256: createHash("sha256").update(bytes).digest("hex"),
    artifactDigest: digest(artifact), sourceSha256: artifact.source.sha256,
    selectedEntryDigest: artifact.population.entryDigest, entries: artifact.population.accepted,
    eventsPerView: artifact.transitions.phoneEvents + artifact.transitions.entries,
  };
  for (const key of Object.keys(actual) as (keyof ReferencePin)[]) {
    if (actual[key] !== expected[key]) throw new Error(`Pinned reference differs: ${key}`);
  }
  if (envelope.digest !== expected.artifactDigest || artifact.transitions.entries !== expected.entries ||
      artifact.transitions.entryDigest !== expected.selectedEntryDigest) throw new Error("Reference envelope or transition population differs.");
  return {
    identity: { artifactDigest: actual.artifactDigest, rawSourceSha256: actual.sourceSha256, selectedEntryDigest: actual.selectedEntryDigest },
    entries: artifact.transitions.entries, phoneEvents: artifact.transitions.phoneEvents,
    native: artifact.transitions.native, base: artifact.transitions.base,
  };
}
