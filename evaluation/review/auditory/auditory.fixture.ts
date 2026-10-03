import { fixtureSnapshot } from "../fixtures.js";
import type { Snapshot } from "../model.js";
import { digest } from "../snapshot.js";
import { allocateAuditory } from "./allocation.js";
import { bytesHash, freezeRelease } from "./audio.js";
import type { AssetMaterial } from "./audio.js";
import { freezeAuditory } from "./freeze.js";
import type { AuditoryComparison, AuditoryExport, AuditoryRegistration, PronunciationPolicy } from "./model.js";

export function policy(): PronunciationPolicy {
  return { version: "auditory-pronunciation-v1", dialect: "Explicit synthetic test inventory, no English dialect claim",
    scope: "Development phone/stress contracts only.", phones: [
      { id: "p", ipa: "p", description: "Voiceless bilabial stop" },
      { id: "a", ipa: "a", description: "Open vowel used in synthetic fixtures" },
      { id: "i", ipa: "i", description: "Close front vowel used in synthetic fixtures" },
      { id: "t", ipa: "t", description: "Voiceless alveolar stop" },
    ], mappings: ["p", "a", "i", "t"].map(source => ({ source, status: "mapped", phones: [source], rationale: "Exact identity in synthetic fixture inventory." })) };
}
export function registration(): AuditoryRegistration {
  return { version: "auditory-comparison-v1", study_id: "auditory-fixture", purpose: "development-fixture",
    candidate_selection: "Synthetic contract fixtures only; no human stimulus selection.", population: "Synthetic slots; no people.",
    assignment_seed: 42, pairs_per_stratum: 1, session_length: 2, participant_slots: ["p1", "p2", "p3", "p4"],
    strata: [{ id: "all", lengths: [1, 100], syllables: [1, 20], morphology: ["bare", "prefixed", "suffixed", "prefixed-and-suffixed", "applied-unspecified"] }],
    pronunciation: policy(), production: { method: "development-fixture", voice: "Synthetic PCM ramps, not speech",
      producer_person_key: digest("synthetic-producer"), settings_digest: digest({ fixture: "pcm-ramp-v1" }), sample_rate: 8000, maximum_seconds: 2 } };
}
export function syntheticSnapshot(id: string, phones: string[], spellings = phones.map((_, index) => `item${index}`)): Snapshot {
  const snapshot = fixtureSnapshot(id, spellings);
  snapshot.samples.forEach((sample, index) => {
    const exemplar = structuredClone(sample.word.syllables[0].nucleus[0]);
    sample.word.syllables = [{ onset: [], nucleus: [{ ...exemplar, sound: phones[index] }], coda: [], stress: "ˈ" }];
    sample.word.pronunciation = `ˈ${phones[index]}`;
  });
  return resealSnapshot(snapshot);
}
export function resealSnapshot(snapshot: Snapshot): Snapshot {
  snapshot.digest = digest({ manifest: snapshot.manifest, words: snapshot.samples.map(sample => sample.word) });
  snapshot.samples.forEach((sample, index) => { sample.id = digest([snapshot.digest, index]); });
  return snapshot;
}
export function comparison(): AuditoryComparison {
  return freezeAuditory(registration(), {
    baseline: syntheticSnapshot("baseline-fixture", ["a", "a", "i", "p"], ["one", "other", "same", "base"]),
    candidate: syntheticSnapshot("candidate-fixture", ["a", "i", "t"], ["third", "same", "cand"]),
  });
}
export function wav(marker = 1000): Buffer {
  const bytes = Buffer.alloc(44 + 80 * 2);
  bytes.write("RIFF"); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write("WAVE", 8);
  bytes.write("fmt ", 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36); bytes.writeUInt32LE(160, 40);
  for (let index = 0; index < 80; index++) bytes.writeInt16LE(index % 2 ? marker : -marker, 44 + 2 * index);
  return bytes;
}
export function materials(frozen: AuditoryComparison, verifiers = 0): AssetMaterial[] {
  const targets = [...new Map(frozen.items.map(item => [item.target.digest, item.target])).values()];
  return targets.map((target, index) => {
    const bytes = wav(1000 + index), transcript = Buffer.from(JSON.stringify(target.syllables));
    const production = { version: "auditory-production-record-v1",
      target_digest: target.digest, audio_sha256: bytesHash(bytes), contract_digest: digest(frozen.registration.production),
      method_details: `SYNTHETIC PCM ramp ${index}; not speech or real production evidence.` };
    return { target_digest: target.digest, wav: bytes, production_record: Buffer.from(JSON.stringify(production)),
      verification: Array.from({ length: verifiers }, (_, person) => ({ transcription_file: transcript,
        record: { person_key: digest(`synthetic-verifier-${person}`), audio_sha256: bytesHash(bytes), policy_digest: target.policy_digest,
          transcription_sha256: bytesHash(transcript), transcription: target.syllables,
          independent_of_production: true, blind_to_condition_and_target: true, method: "Synthetic attestation fixture; no humans or speech." } })) };
  });
}
export function emptyExport(): AuditoryExport {
  const frozen = comparison();
  return { version: "auditory-export-v1", comparison: frozen, release: freezeRelease(frozen, materials(frozen)), plan: allocateAuditory(frozen), responses: [] };
}

