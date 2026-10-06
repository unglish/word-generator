import { syntheticSnapshot, wav } from "../auditory/auditory.fixture.js";
import { digest } from "../snapshot.js";
import { allocateReadAloud } from "./allocation.js";
import { freezeAdjudication } from "./coding.js";
import { freezeReadAloud } from "./freeze.js";
import { files, observed, registration } from "./read-aloud.fixture.js";
import { freezeReading, freezeReadAloudRoster } from "./readings.js";
import type { ReadAloudComparison, ReadAloudExport, ReadingTranscription } from "./model.js";
import type { ReadingMaterial } from "./report.js";

export type TrialOutcome =
  | { status: "missing" }
  | { status: "skipped" | "recording-failed" }
  | { status: "awaiting-adjudication" }
  | { status: "coded"; transcription: ReadingTranscription };

export function weightedComparison(): ReadAloudComparison {
  return freezeReadAloud(registration(), {
    baseline: syntheticSnapshot("weighted-baseline", ["a", "a", "a", "i"], ["alpha", "alpha", "alpha", "beta"]),
    candidate: syntheticSnapshot("weighted-candidate", ["t", "p"], ["gamma", "delta"]),
  });
}

export function makeExport(comparison: ReadAloudComparison = weightedComparison(),
  outcome: (item: ReadAloudComparison["partition"]["items"][number], index: number) => TrialOutcome = () => ({ status: "coded", transcription: observed() })):
  { data: ReadAloudExport; materials: ReadingMaterial[] } {
  const plan = allocateReadAloud(comparison);
  const roster = freezeReadAloudRoster(comparison, "SYNTHETIC fixture identities only", comparison.registration.participant_slots.map(slot => ({
    participant_slot: slot, person_key: digest(["synthetic-reader", slot]), verification_sha256: digest(["synthetic-verification", slot]),
  })));
  const data: ReadAloudExport = { version: "read-aloud-export-v1", comparison, plan, roster, readings: [], adjudications: [] }, materials: ReadingMaterial[] = [];
  let index = 0;
  for (const session of plan.sessions) {
    const person = roster.entries.find(entry => entry.participant_slot === session.participant_slot)!;
    session.item_ids.forEach((id, position) => {
      const item = comparison.partition.items.find(value => value.id === id)!, selected = outcome(item, index++);
      if (selected.status === "missing") return;
      const identity = { session_id: session.id, position, item_id: id, person_key: person.person_key, first_attempt: true as const };
      if (selected.status === "skipped" || selected.status === "recording-failed") {
        data.readings.push(freezeReading(comparison, plan, roster, identity, { status: selected.status, reason: "SYNTHETIC unavailable trial" }));
        return;
      }
      const recording = wav(1000 + index), reading = freezeReading(comparison, plan, roster, identity, { status: "recorded", wav: recording });
      data.readings.push(reading);
      const material: ReadingMaterial = { reading_id: reading.id, wav: recording };
      if (selected.status === "coded") {
        const input = files(reading, selected.transcription);
        data.adjudications.push(freezeAdjudication(comparison, reading, roster, input.coders, input.decision));
        material.coding = input;
      }
      materials.push(material);
    });
  }
  return { data, materials };
}
