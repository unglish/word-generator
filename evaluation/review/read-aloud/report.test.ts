import { describe, expect, it } from "vitest";
import { bytesHash } from "../auditory/audio.js";
import { makeTarget } from "../auditory/targets.js";
import { digest } from "../snapshot.js";
import { freezeAdjudication } from "./coding.js";
import { freezeReadAloud } from "./freeze.js";
import { fixture, observed } from "./read-aloud.fixture.js";
import { makeExport, weightedComparison } from "./report.fixture.js";
import type { TrialOutcome } from "./report.fixture.js";
import { reportReadAloud } from "./report.js";

describe("authenticated source-weighted read-aloud reports", () => {
  it("averages readers per source draw before applying original draw multiplicity", () => {
    const uses = new Map<string, number>();
    const input = makeExport(weightedComparison(), item => {
      const count = uses.get(item.spelling) ?? 0; uses.set(item.spelling, count + 1);
      if (item.condition === "candidate" || (item.spelling === "beta" && count > 0)) return { status: "missing" };
      return { status: "coded", transcription: observed(item.spelling === "alpha" && count > 0 ? "i" : "a") };
    });
    const report = reportReadAloud(input.data, input.materials), baseline = report.groups.find(group => group.condition === "baseline" && group.stratum === null)!;
    expect(baseline.metrics.intended_phones).toEqual({ mean: 0.375, pool_draws: 4, eligible_source_draws: 4, covered_draws: 4,
      pool_spellings: 2, covered_spellings: 2, source_draw_score_cells: 7, matched_source_draw_score_cells: 3 });
    expect(baseline.planned_trials).toBe(4); expect(baseline.statuses.missing).toBe(1); expect(baseline.statuses.transcribed).toBe(3);
    expect(report.groups.find(group => group.condition === "candidate" && group.stratum === null)!.metrics.intended_phones.mean).toBeNull();
    expect(report.verified_distinct_people).toBeNull(); expect(report.intervals).toBeNull();
    expect(report.contrasts[0].differences.intended_phones).toBeNull();
  });
  it("empty exports preserve all planned trials and pool denominators with unavailable means", () => {
    const input = makeExport(weightedComparison(), () => ({ status: "missing" })), report = reportReadAloud(input.data, []);
    expect(report.trials).toHaveLength(8); expect(report.trials.every(trial => trial.status === "missing")).toBe(true);
    expect(report.source_draws).toHaveLength(6);
    const baseline = report.groups.find(group => group.condition === "baseline" && group.stratum === null)!;
    expect(baseline.metrics.intended_phones.mean).toBeNull(); expect(baseline.metrics.intended_phones.pool_draws).toBe(4);
    expect(baseline.metrics.intended_phones.covered_draws).toBe(0); expect(baseline.statuses.missing).toBe(4);
  });
  it("retains missing, skip, recording failure, uncoded, uncertain and untranscribable statuses", () => {
    const outcomes: TrialOutcome[] = [{ status: "missing" }, { status: "skipped" }, { status: "recording-failed" }, { status: "awaiting-adjudication" },
      { status: "coded", transcription: { status: "uncertain", alternatives: [[{ phones: ["a"], stress: "primary" }]], reason: "SYNTHETIC uncertain reading" } },
      { status: "coded", transcription: { status: "untranscribable", reason: "SYNTHETIC inaudible reading" } },
      { status: "coded", transcription: observed("a", "unknown") }, { status: "coded", transcription: observed() }];
    const input = makeExport(weightedComparison(), (_, index) => outcomes[index]), report = reportReadAloud(input.data, input.materials);
    const counts = new Map<string, number>();
    for (const trial of report.trials) counts.set(trial.status, (counts.get(trial.status) ?? 0) + 1);
    expect(Object.fromEntries(counts)).toEqual({ missing: 1, skipped: 1, "recording-failed": 1, "awaiting-adjudication": 1, uncertain: 1, untranscribable: 1, transcribed: 2 });
    for (const draw of report.source_draws) {
      for (const score of draw.scores) {
        const trial = report.trials.find(value => value.reading_id === score.reading_id)!;
        if (trial.status !== "transcribed") expect(score.agreement.intended_phones).toBeNull();
      }
    }
  });
  it("unknown stress changes combined coverage while preserving definite phone observations", () => {
    const uses = new Set<string>();
    const input = makeExport(weightedComparison(), item => {
      if (item.condition !== "baseline" || uses.has(item.spelling)) return { status: "missing" };
      uses.add(item.spelling);
      return { status: "coded", transcription: observed(item.spelling === "alpha" ? "a" : "i", item.spelling === "alpha" ? "unknown" : "primary") };
    });
    const report = reportReadAloud(input.data, input.materials), baseline = report.groups.find(group => group.condition === "baseline" && group.stratum === null)!;
    expect(baseline.metrics.intended_phones.mean).toBe(1); expect(baseline.metrics.intended_phones.covered_draws).toBe(4);
    expect(baseline.metrics.intended_phones_and_stress.mean).toBe(1); expect(baseline.metrics.intended_phones_and_stress.covered_draws).toBe(1);
    expect(baseline.unknown_stress_decisions).toBe(1);
  });
  it("unresolved source targets remain in pool coverage without being scored as failures", () => {
    const base = weightedComparison(), registration = structuredClone(base.registration);
    registration.pronunciation.mappings = registration.pronunciation.mappings.filter(mapping => mapping.source !== "a");
    const comparison = freezeReadAloud(registration, base.partition.conditions);
    const input = makeExport(comparison, item => ({ status: "coded", transcription: observed(item.spelling === "beta" ? "i" : "a") }));
    const baseline = reportReadAloud(input.data, input.materials).groups.find(group => group.condition === "baseline" && group.stratum === null)!;
    expect(baseline.metrics.intended_phones.pool_draws).toBe(4); expect(baseline.metrics.intended_phones.eligible_source_draws).toBe(1);
    expect(baseline.metrics.intended_phones.covered_draws).toBe(1); expect(baseline.metrics.intended_phones.mean).toBe(1);
  });
  it("one observed spelling scores every conflicting original intended target", () => {
    const comparison = fixture().comparison;
    const input = makeExport(comparison, item => item.spelling === "same" ? { status: "coded", transcription: observed("i") } : { status: "missing" });
    const report = reportReadAloud(input.data, input.materials), rows = report.source_draws.filter(draw => draw.condition === "baseline" && draw.spelling === "same");
    expect(rows).toHaveLength(2); expect(rows[0].scores.length).toBeGreaterThan(0);
    expect(rows[0].scores.map(score => score.reading_id)).toEqual(rows[1].scores.map(score => score.reading_id));
    expect(new Set(rows.map(row => row.scores[0].agreement.intended_phones))).toEqual(new Set([true, false]));
    expect(report.groups.find(group => group.condition === "baseline" && group.stratum === null)!.metrics.intended_phones.mean).toBe(0.5);
  });
  it("rejects duplicate receipts, materials and adjudications rather than choosing a latest value", () => {
    const input = makeExport();
    expect(() => reportReadAloud({ ...input.data, readings: [...input.data.readings, input.data.readings[0]] }, input.materials)).toThrow("Duplicate reading trial");
    expect(() => reportReadAloud(input.data, [...input.materials, input.materials[0]])).toThrow("Duplicate recording material");
    expect(() => reportReadAloud({ ...input.data, adjudications: [...input.data.adjudications, input.data.adjudications[0]] }, input.materials)).toThrow("Duplicate adjudication");
  });
  it("requires all original recording and independent transcription bytes", () => {
    const input = makeExport();
    expect(() => reportReadAloud(input.data, input.materials.slice(1))).toThrow("Every recorded reading");
    const noCoding = input.materials.map(material => ({ reading_id: material.reading_id, wav: material.wav }));
    expect(() => reportReadAloud(input.data, noCoding)).toThrow("Original coder and adjudicator bytes");
    const changed = structuredClone(input.materials); changed[0].wav[44] ^= 1;
    expect(() => reportReadAloud(input.data, changed)).toThrow("changed");
    const changedDecision = structuredClone(input.materials); changedDecision[0].coding!.decision = Buffer.concat([changedDecision[0].coding!.decision, Buffer.from("\n")]);
    expect(() => reportReadAloud(input.data, changedDecision)).toThrow("transcription bytes changed");
  });
  it("shows coder agreement independently from generator-target agreement", () => {
    const input = makeExport(), report = reportReadAloud(input.data, input.materials);
    expect(report.trials.every(trial => trial.coder_disagreement && trial.coder_phone_agreement === false && trial.coder_phones_and_stress_agreement === false)).toBe(true);
    for (const group of report.groups) {
      expect(group.coders_both_definite).toBe(group.adjudicated_recordings);
      expect(group.coder_phone_disagreements).toBe(group.adjudicated_recordings);
    }
  });
  it("does not treat different uncertainty reasons as pronunciation disagreement", () => {
    const input = makeExport(), material = input.materials[0], reading = input.data.readings[0];
    const coders = material.coding!.coders.map((bytes, index) => {
      const record = JSON.parse(Buffer.from(bytes).toString());
      record.transcription = { status: "uncertain", alternatives: [[{ phones: ["a"], stress: "primary" }]], reason: `Different synthetic prose ${index}` };
      return Buffer.from(JSON.stringify(record));
    }) as [Buffer, Buffer];
    const decision = JSON.parse(Buffer.from(material.coding!.decision).toString()); decision.coder_file_sha256 = coders.map(bytesHash);
    material.coding = { coders, decision: Buffer.from(JSON.stringify(decision)) };
    input.data.adjudications[0] = freezeAdjudication(input.data.comparison, reading, input.data.roster, coders, material.coding.decision);
    const trial = reportReadAloud(input.data, input.materials).trials.find(value => value.reading_id === reading.id)!;
    expect(trial.coder_disagreement).toBe(false); expect(trial.coder_phone_agreement).toBeNull(); expect(trial.coder_phones_and_stress_agreement).toBeNull();
  });
  it("retains all registered strata and rejects a resealed wrong-slot reading", () => {
    const input = makeExport(), report = reportReadAloud(input.data, input.materials);
    expect(report.groups.map(group => [group.condition, group.stratum])).toEqual([["baseline", null], ["baseline", "all"], ["candidate", null], ["candidate", "all"]]);
    const reading = input.data.readings[0]; reading.person_key = input.data.roster.entries.find(entry => entry.person_key !== reading.person_key)!.person_key;
    const { id: oldId, ...content } = reading; reading.id = digest(content);
    input.materials[0].reading_id = reading.id;
    expect(oldId).not.toBe(reading.id);
    expect(() => reportReadAloud(input.data, input.materials)).toThrow("assigned first attempt");
  });
  it("shows separate principal and accepted differences and authenticates all rationale bytes", () => {
    const base = weightedComparison(), registration = structuredClone(base.registration);
    const bytes = Buffer.from("SYNTHETIC alternative rationale; no linguistic evidence."), hash = bytesHash(bytes);
    const target = makeTarget(registration.pronunciation, [{ phones: ["t"], stress: "primary" }]);
    registration.alternatives = base.partition.items.filter(item => item.condition === "baseline" && item.spelling === "alpha").flatMap(item =>
      item.draws.map(draw => ({ condition: draw.condition, sample_id: draw.sample_id, target, rationale: "SYNTHETIC declared alternative", evidence_sha256: hash })));
    const comparison = freezeReadAloud(registration, base.partition.conditions), input = makeExport(comparison, () => ({ status: "coded", transcription: observed("t") }));
    expect(() => reportReadAloud(input.data, input.materials)).toThrow("exact retained original rationale");
    expect(() => reportReadAloud(input.data, input.materials, [{ sha256: hash, bytes: Buffer.from("changed") }])).toThrow("rationale evidence bytes");
    const report = reportReadAloud(input.data, input.materials, [{ sha256: hash, bytes }]);
    expect(report.alternative_evidence_sha256).toEqual([hash]);
    expect(report.contrasts[0].differences.intended_phones).toBe(0.5);
    expect(report.contrasts[0].differences.accepted_phones).toBe(-0.25);
    expect(report.groups[0].metrics.accepted_phones.mean).toBe(0.75);
    expect(report.groups[0].metrics.intended_phones.mean).toBe(0);
  });
});
