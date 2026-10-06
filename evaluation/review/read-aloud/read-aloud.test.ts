import { describe, expect, it } from "vitest";
import { bytesHash } from "../auditory/audio.js";
import { makeTarget } from "../auditory/targets.js";
import { digest } from "../snapshot.js";
import { assessDrawAgreement } from "./agreement.js";
import { allocateReadAloud, readAloudPacket, validateReadAloudPlan } from "./allocation.js";
import { freezeAdjudication, validateReadingTranscription, verifyAdjudication } from "./coding.js";
import { freezeReadAloud, validateReadAloud } from "./freeze.js";
import { blindCoderPacket, freezeReading, freezeReadAloudRoster, verifyReading } from "./readings.js";
import { files, fixture, observed } from "./read-aloud.fixture.js";
import type { AdjudicationRecord, ReadAloudDraw } from "./model.js";

describe("prospective read-aloud source and assignment contracts", () => {
  it("retains every draw and conflicting intended pronunciations for one spelling", () => {
    const { comparison } = fixture();
    expect(comparison.draws).toHaveLength(7);
    const same = comparison.partition.items.find(item => item.condition === "baseline" && item.spelling === "same")!;
    expect(same.draws).toHaveLength(2);
    const targets = comparison.draws.filter(draw => same.draws.some(source => source.sample_id === draw.sample_id));
    expect(new Set(targets.map(draw => draw.intended.status === "resolved" && draw.intended.target.digest)).size).toBe(2);
  });
  it("allocates deterministically without repeated spelling across sessions or arms", () => {
    const { comparison, plan } = fixture();
    expect(allocateReadAloud(comparison)).toEqual(plan);
    for (const slot of comparison.registration.participant_slots) {
      const ids = plan.sessions.filter(session => session.participant_slot === slot).flatMap(session => session.item_ids);
      const spellings = ids.map(id => comparison.partition.items.find(item => item.id === id)!.spelling);
      expect(new Set(spellings).size).toBe(spellings.length);
    }
    const changed = structuredClone(plan); changed.sessions[0].item_ids.reverse();
    expect(() => validateReadAloudPlan(comparison, changed)).toThrow("allocation changed");
  });
  it("participant packets contain only assigned spellings and instructions", () => {
    const { comparison, plan } = fixture(), packet = readAloudPacket(comparison, plan, plan.sessions[0].id);
    expect(Object.keys(packet).sort()).toEqual(["instructions", "items", "session_id"]);
    for (const item of packet.items) expect(Object.keys(item).sort()).toEqual(["item_id", "position", "spelling"]);
    expect(JSON.stringify(packet)).not.toContain("target");
    expect(JSON.stringify(packet)).not.toContain("candidate");
  });
  it("binds acceptable alternatives to exact source draws before outcomes", () => {
    const { comparison } = fixture(), registration = structuredClone(comparison.registration);
    const target = makeTarget(registration.pronunciation, [{ phones: ["t"], stress: "primary" }]);
    const draw = comparison.draws.find(value => value.intended.status === "resolved" && value.intended.target.digest !== target.digest)!;
    registration.alternatives.push({ condition: draw.condition, sample_id: draw.sample_id, target,
      rationale: "Synthetic declared alternative, no English claim", evidence_sha256: digest("synthetic-rationale-file") });
    const frozen = freezeReadAloud(registration, comparison.partition.conditions);
    expect(frozen.draws.find(value => value.sample_id === draw.sample_id && value.condition === draw.condition)!.alternatives).toEqual([target]);
    expect(frozen.draws.filter(value => value.alternatives.length)).toHaveLength(1);
    expect(frozen.digest).not.toBe(comparison.digest);
    expect(() => freezeReadAloud({ ...registration, alternatives: [...registration.alternatives, ...registration.alternatives] }, comparison.partition.conditions)).toThrow("Duplicate");
    frozen.registration.alternatives[0].rationale = "changed after outcomes";
    expect(() => validateReadAloud(frozen)).toThrow("changed");
  });
  it("retains unresolved intended targets without supplying or filtering pronunciations", () => {
    const { comparison } = fixture(), registration = structuredClone(comparison.registration);
    registration.pronunciation.mappings = registration.pronunciation.mappings.filter(mapping => mapping.source !== "a");
    const unresolved = freezeReadAloud(registration, comparison.partition.conditions);
    expect(unresolved.draws).toHaveLength(7);
    expect(unresolved.draws.some(draw => draw.intended.status === "unresolved")).toBe(true);
    expect(allocateReadAloud(unresolved).sessions).toHaveLength(comparison.registration.participant_slots.length);
    const draw = unresolved.draws.find(value => value.intended.status === "unresolved")!;
    const target = makeTarget(registration.pronunciation, [{ phones: ["t"], stress: "primary" }]);
    registration.alternatives.push({ condition: draw.condition, sample_id: draw.sample_id, target, rationale: "forbidden imputation", evidence_sha256: digest("file") });
    expect(() => freezeReadAloud(registration, comparison.partition.conditions)).toThrow("resolved source");
  });
});

describe("recording and blind coding receipts", () => {
  it("authenticates actual PCM bytes and the assigned reader", () => {
    const f = fixture();
    expect(() => verifyReading(f.comparison, f.plan, f.roster, f.reading, f.recording)).not.toThrow();
    const damaged = Buffer.from(f.recording); damaged[44] ^= 1;
    expect(() => verifyReading(f.comparison, f.plan, f.roster, f.reading, damaged)).toThrow("changed");
    expect(() => verifyReading(f.comparison, f.plan, f.roster, f.reading)).toThrow("Actual recording bytes");
    expect(() => freezeReading(f.comparison, f.plan, f.roster, { ...f.reading, person_key: digest("unknown-reader") }, { status: "recorded", wav: f.recording })).toThrow("assigned first attempt");
  });
  it("rejects duplicate people across registered reader slots", () => {
    const { comparison, roster } = fixture(), entries = structuredClone(roster.entries);
    entries[1].person_key = entries[0].person_key;
    expect(() => freezeReadAloudRoster(comparison, roster.verification_method, entries)).toThrow("distinct");
  });
  it("keeps explicit skips and recording failures distinct from mismatches", () => {
    const f = fixture();
    for (const status of ["skipped", "recording-failed"] as const) {
      const reading = freezeReading(f.comparison, f.plan, f.roster, f.reading, { status, reason: "Synthetic unavailable outcome" });
      expect(reading.outcome).toEqual({ status, reason: "Synthetic unavailable outcome" });
      expect(() => verifyReading(f.comparison, f.plan, f.roster, reading)).not.toThrow();
      expect(() => blindCoderPacket(f.comparison, f.plan, f.roster, reading, f.recording)).toThrow("recorded reading");
    }
  });
  it("coder packet has no spelling, target, condition, source mapping or reader identity", () => {
    const f = fixture(), packet = blindCoderPacket(f.comparison, f.plan, f.roster, f.reading, f.recording);
    expect(Object.keys(packet).sort()).toEqual(["audio_sha256", "dialect", "phones", "reading_id"]);
    expect(JSON.stringify(packet)).not.toContain(f.reading.person_key);
    expect(JSON.stringify(packet)).not.toContain("mappings");
  });
  it("requires two coders at runtime even if file hashes are consistently resealed", () => {
    const f = fixture(), input = files(f.reading);
    for (const coders of [[], [input.coders[0]], [...input.coders, input.coders[0]]]) {
      const decision = JSON.parse(input.decision.toString()) as AdjudicationRecord;
      decision.coder_file_sha256 = coders.map(bytesHash) as [string, string];
      expect(() => freezeAdjudication(f.comparison, f.reading, f.roster, coders as [Buffer, Buffer], Buffer.from(JSON.stringify(decision)))).toThrow("Exactly two");
    }
  });
  it("seals both original coder files and a third blind adjudication", () => {
    const f = fixture(), input = files(f.reading);
    const frozen = freezeAdjudication(f.comparison, f.reading, f.roster, input.coders, input.decision);
    expect(frozen.coders[0].record.transcription).not.toEqual(frozen.coders[1].record.transcription);
    expect(frozen.decision_file_sha256).toBe(bytesHash(input.decision));
    expect(() => verifyAdjudication(f.comparison, f.reading, f.roster, frozen, input.coders, input.decision)).not.toThrow();
    const changed = Buffer.concat([input.decision, Buffer.from("\n")]);
    expect(() => verifyAdjudication(f.comparison, f.reading, f.roster, frozen, input.coders, changed)).toThrow("bytes changed");
  });
  it("rejects dependent coders and an adjudicator reused from the reader cohort", () => {
    const f = fixture(), input = files(f.reading);
    expect(() => freezeAdjudication(f.comparison, f.reading, f.roster, [input.coders[0], input.coders[0]], input.decision)).toThrow("distinct");
    const coder = JSON.parse(input.coders[1].toString()); coder.person_key = f.roster.entries[1].person_key;
    expect(() => freezeAdjudication(f.comparison, f.reading, f.roster, [input.coders[0], Buffer.from(JSON.stringify(coder))], input.decision)).toThrow("outside the reader cohort");
    const decision = JSON.parse(input.decision.toString()); decision.person_key = f.roster.entries[1].person_key;
    expect(() => freezeAdjudication(f.comparison, f.reading, f.roster, input.coders, Buffer.from(JSON.stringify(decision)))).toThrow("third independent");
  });
  it("requires decisions to bind original file bytes, not equivalent reserialized JSON", () => {
    const f = fixture(), input = files(f.reading);
    const changed: [Buffer, Buffer] = [Buffer.from(JSON.stringify(JSON.parse(input.coders[0].toString()), null, 2)), input.coders[1]];
    expect(() => freezeAdjudication(f.comparison, f.reading, f.roster, changed, input.decision)).toThrow("exact original coder files");
  });
  it("rejects wrong recordings, missing blindness and undeclared phone symbols", () => {
    const f = fixture(), input = files(f.reading), coder = JSON.parse(input.coders[0].toString());
    coder.audio_sha256 = digest("different-wave");
    expect(() => freezeAdjudication(f.comparison, f.reading, f.roster, [Buffer.from(JSON.stringify(coder)), input.coders[1]], input.decision)).toThrow("blind independent");
    coder.audio_sha256 = f.reading.outcome.status === "recorded" ? f.reading.outcome.audio.sha256 : "";
    coder.blind_to_spelling_condition_and_target = false;
    expect(() => freezeAdjudication(f.comparison, f.reading, f.roster, [Buffer.from(JSON.stringify(coder)), input.coders[1]], input.decision)).toThrow("blind independent");
    expect(() => validateReadingTranscription(f.comparison.registration.pronunciation, observed("outside-inventory"))).toThrow("Invalid observed");
  });
});

describe("phones and stress agreement without outcome-driven alternatives", () => {
  function draw(): { source: ReadAloudDraw; policy: ReturnType<typeof fixture>["comparison"]["registration"]["pronunciation"] } {
    const policy = fixture().comparison.registration.pronunciation;
    return { policy, source: { condition: "baseline", stratum: "all", sample_id: digest("source"), draw_index: 0,
      intended: { status: "resolved", target: makeTarget(policy, [{ phones: ["a", "t"], stress: "primary" }]) }, alternatives: [] } };
  }
  it("separates exact phone sequence from syllable and stress agreement", () => {
    const { source, policy } = draw();
    const result = assessDrawAgreement(policy, source, { status: "transcribed", syllables: [{ phones: ["a"], stress: "primary" }, { phones: ["t"], stress: "unmarked" }] });
    expect(result.intended_phones).toBe(true); expect(result.intended_phones_and_stress).toBe(false);
  });
  it("unknown stress withholds only the phones-and-stress metric", () => {
    const { source, policy } = draw();
    const result = assessDrawAgreement(policy, source, { status: "transcribed", syllables: [{ phones: ["a", "t"], stress: "unknown" }] });
    expect(result.phones_available).toBe(true); expect(result.intended_phones).toBe(true);
    expect(result.phones_and_stress_available).toBe(false); expect(result.intended_phones_and_stress).toBeNull();
  });
  it("explicitly observed unmarked stress is a mismatch rather than an inserted primary", () => {
    const { source, policy } = draw();
    const result = assessDrawAgreement(policy, source, { status: "transcribed", syllables: [{ phones: ["a", "t"], stress: "unmarked" }] });
    expect(result.intended_phones).toBe(true); expect(result.intended_phones_and_stress).toBe(false);
  });
  it("uncertain, untranscribable and missing readings never become zero agreement", () => {
    const { source, policy } = draw();
    const observations = [null, { status: "untranscribable" as const, reason: "inaudible" },
      { status: "uncertain" as const, alternatives: [[{ phones: ["a", "t"], stress: "primary" as const }]], reason: "uncertain audio" }];
    for (const observation of observations) {
      const result = assessDrawAgreement(policy, source, observation);
      expect(result.phones_available).toBe(false); expect(result.intended_phones).toBeNull(); expect(result.accepted_phones).toBeNull();
    }
  });
  it("reports principal intended and prospectively acceptable readings separately", () => {
    const { source, policy } = draw();
    source.alternatives.push(makeTarget(policy, [{ phones: ["i"], stress: "primary" }]));
    const result = assessDrawAgreement(policy, source, observed("i"));
    expect(result.intended_phones).toBe(false); expect(result.accepted_phones).toBe(true);
    expect(result.intended_phones_and_stress).toBe(false); expect(result.accepted_phones_and_stress).toBe(true);
  });
  it("unresolved source targets remain unavailable even for a definite observed reading", () => {
    const { source, policy } = draw();
    source.intended = { status: "unresolved", issues: [{ kind: "missing-primary", syllable: null, source: null }] };
    const result = assessDrawAgreement(policy, source, observed());
    expect(result.source_available).toBe(false); expect(result.intended_phones).toBeNull();
  });
});
