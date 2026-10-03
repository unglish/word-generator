import { digest } from "../snapshot.js";
import { allocateAuditory } from "./allocation.js";
import { freezeRelease } from "./audio.js";
import { materials, registration, resealSnapshot, syntheticSnapshot } from "./auditory.fixture.js";
import { freezeAuditory } from "./freeze.js";
import { freezeAuditoryRoster } from "./inference-protocol.js";
import type { AuditoryInferenceProtocol } from "./inference-model.js";
import type { AuditoryExport, AuditoryResponse } from "./model.js";

export const AUDITORY_INFERENCE_CASES = ["weighted-complete", "shared-targets", "stress-boundary", "missing-states", "unfamiliar-selection",
  "all-familiar", "unequal-exposure", "all-missing", "sparse-gates"] as const;
export type AuditoryInferenceCase = typeof AUDITORY_INFERENCE_CASES[number];
export function inferenceProtocol(): AuditoryInferenceProtocol {
  return { version: "auditory-crossed-stability-v1", primary_cohort: "all-ratings", metric: "share-4-5", seed: 812345,
    replicates: 31, confidence: 0.95, minimum_rated_listeners_per_condition: 2, minimum_rated_targets_per_condition: 2, minimum_draw_coverage: 0.5,
    listener_sampling_assumption: "SYNTHETIC registered listener slots only; no real people.",
    target_sampling_assumption: "SYNTHETIC target effects including shared phones and distinct stress; no human quality evidence.",
    missingness_assumption: "Retained engineering missing/familiarity fixtures; no ignorable selection claim.",
    production_scope: "Single synthetic PCM-ramp procedure only, not speech or multiple-speaker evidence." };
}
export function auditoryInferenceFixture(kind: AuditoryInferenceCase = "weighted-complete") {
  const protocol = inferenceProtocol();
  if (kind === "unfamiliar-selection") protocol.primary_cohort = "unfamiliar-only";
  if (kind === "sparse-gates") { protocol.minimum_rated_listeners_per_condition = 8; protocol.minimum_rated_targets_per_condition = 8; }
  const baseline = syntheticSnapshot("auditory-inference-base", ["a", "a", "i", "p"], ["first", "second", "same", "other"]);
  const candidate = syntheticSnapshot("auditory-inference-candidate", ["a", "i", "t"], ["same", "changed", "same"]);
  if (kind === "stress-boundary") {
    for (const [snapshot, index, firstStress] of [[baseline, 3, true], [candidate, 2, false]] as const) {
      const word = snapshot.samples[index].word, exemplar = structuredClone(word.syllables[0].nucleus[0]);
      word.syllables = [{ onset: [], nucleus: [{ ...exemplar, sound: "a" }], coda: [], stress: firstStress ? "ˈ" : undefined },
        { onset: [], nucleus: [{ ...exemplar, sound: "i" }], coda: [], stress: firstStress ? undefined : "ˈ" }];
      word.pronunciation = firstStress ? "ˈa.i" : "a.ˈi";
      resealSnapshot(snapshot);
    }
  }
  const comparison = freezeAuditory({ ...registration(), study_id: "auditory-inference-fixture", inference: protocol }, { baseline, candidate });
  const files = materials(comparison, 2), release = freezeRelease(comparison, files), plan = allocateAuditory(comparison);
  const roster = freezeAuditoryRoster(comparison, "SYNTHETIC distinct listener keys only; no human verification.", comparison.registration.participant_slots.map(slot => ({
    participant_slot: slot, person_key: digest(["auditory-listener", slot]), verification_sha256: digest(["auditory-verification", slot]),
  })));
  const items = new Map(comparison.items.map(item => [item.id, item])), assets = new Map(release.assets.map(asset => [asset.target_digest, asset]));
  const responses: AuditoryResponse[] = [];
  for (const [sessionIndex, session] of plan.sessions.entries()) for (const [position, itemId] of session.item_ids.entries()) {
    const item = items.get(itemId)!, ordinal = responses.length;
    responses.push({ id: `synthetic-${sessionIndex}-${position}`, session_id: session.id, position, item_id: itemId,
      audio_sha256: assets.get(item.target.digest)!.audio.sha256, played_complete: true,
      answer: { status: "rated", rating: (sessionIndex + position) % 3 === 0 ? 2 : 4, familiar: kind === "all-familiar" ||
        (kind === "unfamiliar-selection" && (item.condition === "candidate" ? ordinal % 3 !== 0 : ordinal % 2 === 0)) } });
  }
  if (kind === "missing-states") {
    responses.shift(); responses[0] = { ...responses[0], played_complete: false, answer: { status: "skipped", rating: null, familiar: null } };
  }
  if (kind === "unequal-exposure") {
    const firstSession = plan.sessions[0].id;
    for (let index = responses.length - 1; index >= 0; index--) {
      if (responses[index].session_id !== firstSession && index % 2 === 0) responses.splice(index, 1);
    }
  }
  if (kind === "all-missing") responses.length = 0;
  const data: AuditoryExport = { version: "auditory-export-v1", comparison, release, plan, responses };
  return { data, materials: files, roster };
}
