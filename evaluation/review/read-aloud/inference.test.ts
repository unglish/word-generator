import { describe, expect, it } from "vitest";
import { syntheticSnapshot } from "../auditory/auditory.fixture.js";
import { makeTarget } from "../auditory/targets.js";
import { bytesHash as digestBytes } from "../auditory/audio.js";
import { freezeReadAloud } from "./freeze.js";
import { inferReadAloud, prepareReadAloudInference, resampleReadAloud, weightedReadAloudCondition } from "./inference.js";
import type { PreparedReadAloudInference } from "./inference.js";
import type { ReadAloudInferenceProtocol } from "./inference-model.js";
import { validateReadAloudInference } from "./inference-protocol.js";
import { observed, registration } from "./read-aloud.fixture.js";
import { makeExport } from "./report.fixture.js";
import { AGREEMENT_METRICS, reportReadAloud } from "./report.js";

function protocol(): ReadAloudInferenceProtocol {
  return { version: "read-aloud-crossed-stability-v1", primary_metric: "intended_phones_and_stress", seed: 19823, replicates: 31, confidence: 0.95,
    minimum_scored_readers_per_condition: 2, minimum_scored_spellings_per_condition: 2, minimum_draw_coverage: 0.8,
    reader_sampling_assumption: "Synthetic reader slots only", spelling_sampling_assumption: "Synthetic pool only",
    missingness_assumption: "Synthetic observed availability", coding_assumption: "Synthetic independent-file bindings, not human coders" };
}
function comparison() {
  return freezeReadAloud({ ...registration(), inference: protocol() }, {
    baseline: syntheticSnapshot("weighted-baseline", ["a", "a", "a", "i"], ["alpha", "alpha", "alpha", "beta"]),
    candidate: syntheticSnapshot("weighted-candidate", ["t", "p"], ["gamma", "delta"]),
  });
}
function units(prepared: PreparedReadAloudInference) { return { readers: prepared.factors.readers.map(() => 1), spellings: prepared.factors.spellings.map(() => 1) }; }

describe("prospective read-aloud crossed stability", () => {
  it("requires the protocol frozen before readings and rejects a changed nested protocol", () => {
    const original = makeExport(); expect(() => inferReadAloud(original.data, original.materials)).toThrow(/before observations/);
    const fixture = makeExport(comparison()); fixture.data.comparison.registration.inference!.seed++;
    expect(() => inferReadAloud(fixture.data, fixture.materials)).toThrow(/changed/);
  });
  it("rejects invalid dimensions, primary metric and absent sampling/coding assumptions", () => {
    for (const invalid of [{ seed: -1 }, { seed: 4294967296 }, { replicates: 1 }, { confidence: 1 }, { minimum_scored_readers_per_condition: 1 },
      { minimum_scored_spellings_per_condition: 1 }, { minimum_draw_coverage: 0 }, { primary_metric: "accuracy" }, { coding_assumption: " " }, { missingness_assumption: null }]) {
      expect(() => validateReadAloudInference({ ...protocol(), ...invalid } as ReadAloudInferenceProtocol)).toThrow(/Invalid/);
    }
  });
  it("reproduces all descriptive source-draw means without letting repeated spellings become extra readers", () => {
    const fixture = makeExport(comparison()), prepared = prepareReadAloudInference(fixture.data, fixture.materials);
    const report = reportReadAloud(fixture.data, fixture.materials), result = inferReadAloud(fixture.data, fixture.materials);
    expect(prepared.draws).toHaveLength(6); expect(prepared.factors.readers).toHaveLength(4); expect(prepared.factors.spellings).toHaveLength(4);
    for (const context of result.results) for (const condition of ["baseline", "candidate"] as const) {
      const group = report.groups.find(group => group.condition === condition && group.stratum === context.stratum)!;
      expect(context.point[condition].agreement).toBe(group.metrics[context.metric].mean);
      expect(context.point[condition].covered_draws).toBe(group.metrics[context.metric].covered_draws);
    }
    expect(weightedReadAloudCondition(prepared, units(prepared), "baseline", null, "intended_phones").agreement).toBe(0.75);
    expect(result.results.filter(context => context.primary)).toHaveLength(1);
    expect(result.results.find(context => context.primary)!.metric).toBe("intended_phones_and_stress");
    expect(result.calibration).toBe("not-established"); expect(result.population_intervals).toBeNull();
  });
  it("uses fixed eligible reader counts before global aggregation instead of cancelling unequal reader exposure within every draw", () => {
    const fixture = makeExport(comparison()), prepared = prepareReadAloudInference(fixture.data, fixture.materials);
    prepared.draws = prepared.draws.filter(draw => draw.condition === "baseline").slice(0, 2);
    prepared.draws[0].scores = [{ reader: 0, agreement: { ...prepared.draws[0].scores[0].agreement, intended_phones: true } },
      { reader: 1, agreement: { ...prepared.draws[0].scores[0].agreement, intended_phones: false } }];
    prepared.draws[1].scores = [{ reader: 0, agreement: { ...prepared.draws[1].scores[0].agreement, intended_phones: false } }];
    const weights = units(prepared); weights.readers[0] = 2;
    expect(weightedReadAloudCondition(prepared, weights, "baseline", null, "intended_phones").agreement).toBeCloseTo(2 / 7, 15);
  });
  it("shares one spelling factor for all arms and conflicting source targets while preserving each target score", () => {
    const frozen = freezeReadAloud({ ...registration(), inference: protocol() }, {
      baseline: syntheticSnapshot("shared-baseline", ["a", "i", "p"], ["same", "same", "base"]),
      candidate: syntheticSnapshot("shared-candidate", ["i", "t"], ["same", "cand"]),
    });
    const fixture = makeExport(frozen), prepared = prepareReadAloudInference(fixture.data, fixture.materials);
    const shared = prepared.factors.spellings.indexOf("same"), draws = prepared.draws.filter(draw => draw.spelling === shared);
    expect(draws).toHaveLength(3); expect(new Set(draws.map(draw => draw.condition)).size).toBe(2);
    const sameReader = draws.filter(draw => draw.condition === "baseline");
    expect(sameReader[0].scores.map(score => score.reader)).toEqual(sameReader[1].scores.map(score => score.reader));
    expect(sameReader[0].scores[0].agreement.intended_phones).not.toBe(sameReader[1].scores[0].agreement.intended_phones);
    const result = inferReadAloud(fixture.data, fixture.materials);
    expect(result.rng_draws).toBe(protocol().replicates * (prepared.factors.readers.length + prepared.factors.spellings.length));
  });
  it("withholds combined scores for unknown stress without deleting the phone observation", () => {
    const fixture = makeExport(comparison(), () => ({ status: "coded", transcription: observed("a", "unknown") }));
    const result = inferReadAloud(fixture.data, fixture.materials);
    for (const context of result.results) {
      if (context.metric.endsWith("and_stress")) {
        expect(context.point.baseline.agreement).toBeNull(); expect(context.stability_interval).toBeNull();
        expect(context.unavailable_replicates).toBe(protocol().replicates); expect(context.replicates.every(value => value === null)).toBe(true);
      } else expect(context.valid_replicates).toBe(protocol().replicates);
    }
  });
  it("retains unresolved original targets in coverage rather than resampling only a passing pool", () => {
    const frozen = freezeReadAloud({ ...registration(), inference: protocol() }, {
      baseline: syntheticSnapshot("unresolved-baseline", ["a", "unknown"], ["alpha", "beta"]),
      candidate: syntheticSnapshot("unresolved-candidate", ["t", "p"], ["gamma", "delta"]),
    });
    const fixture = makeExport(frozen), result = inferReadAloud(fixture.data, fixture.materials);
    for (const context of result.results) {
      expect(context.point.baseline.pool_draws).toBe(2); expect(context.point.baseline.eligible_source_draws).toBe(1);
      expect(context.point.baseline.draw_coverage).toBe(0.5); expect(context.stability_interval).toBeNull();
      expect(context.interval_withheld_reasons).toContain("baseline: insufficient covered original draws");
    }
  });
  it("retains every missing/skip/failure/uncoded/uncertain/untranscribable trial and all registered readers", () => {
    const statuses = ["missing", "skipped", "recording-failed", "awaiting-adjudication"] as const;
    const fixture = makeExport(comparison(), (item, index) => index < 4 ? { status: statuses[index] } :
      { status: "coded", transcription: index % 2 ? { status: "uncertain", alternatives: [[{ phones: ["a"], stress: "primary" }]], reason: "Synthetic uncertainty" } :
        { status: "untranscribable", reason: "Synthetic coding loss" } });
    const result = inferReadAloud(fixture.data, fixture.materials);
    expect(result.factors.readers).toHaveLength(4); expect(result.report.trials).toHaveLength(8);
    expect(new Set(result.report.trials.map(trial => trial.status)).size).toBe(6);
    expect(result.results.every(context => context.stability_interval === null)).toBe(true);
    expect(result.results.every(context => context.replicates.length === protocol().replicates)).toBe(true);
  });
  it("keeps accepted alternatives separate from principal scoring with the same replicate factors", () => {
    const original = comparison(), alternativeEvidence = Buffer.from("Synthetic prospective dialect rationale, not English evidence");
    const draw = original.draws.find(draw => draw.condition === "baseline" && draw.intended.status === "resolved" && draw.intended.target.syllables[0].phones[0] === "i")!;
    const frozen = freezeReadAloud({ ...original.registration, alternatives: [{ condition: "baseline", sample_id: draw.sample_id,
      target: makeTarget(original.registration.pronunciation, [{ phones: ["a"], stress: "primary" }]), rationale: "Synthetic prospective alternative", evidence_sha256: digestBytes(alternativeEvidence) }] }, original.partition.conditions);
    const fixture = makeExport(frozen), result = inferReadAloud(fixture.data, fixture.materials, [{ sha256: digestBytes(alternativeEvidence), bytes: alternativeEvidence }]);
    const intended = result.results.find(context => context.stratum === null && context.metric === "intended_phones")!;
    const accepted = result.results.find(context => context.stratum === null && context.metric === "accepted_phones")!;
    expect(intended.point.baseline.agreement).toBe(0.75); expect(accepted.point.baseline.agreement).toBe(1);
    expect(accepted.replicates.every((value, index) => value! <= intended.replicates[index]!)).toBe(true);
  });
  it("is deterministic and does not redraw factors separately for four metrics or strata", () => {
    const fixture = makeExport(comparison()), first = inferReadAloud(fixture.data, fixture.materials), second = inferReadAloud(fixture.data, fixture.materials);
    expect(first).toEqual(second); expect(first.rng_integer_bin_hashes).toHaveLength(protocol().replicates);
    for (const metric of AGREEMENT_METRICS) {
      const overall = first.results.find(context => context.stratum === null && context.metric === metric)!;
      const stratum = first.results.find(context => context.stratum === "all" && context.metric === metric)!;
      expect(overall.replicates).toEqual(stratum.replicates);
    }
  });
  it("refuses changed original audio and changed independent coding bytes", () => {
    const fixture = makeExport(comparison()); fixture.materials[0].wav[44] ^= 1;
    expect(() => inferReadAloud(fixture.data, fixture.materials)).toThrow();
    const second = makeExport(comparison()); second.materials[0].coding!.decision[0] ^= 1;
    expect(() => inferReadAloud(second.data, second.materials)).toThrow();
  });
  it("rejects missing, nonpositive and unrepresentable factor weights", () => {
    const fixture = makeExport(comparison()), prepared = prepareReadAloudInference(fixture.data, fixture.materials);
    for (const value of [0, -1, NaN, Infinity]) { const weights = units(prepared); weights.readers[0] = value;
      expect(() => weightedReadAloudCondition(prepared, weights, "baseline", null, "intended_phones")).toThrow(); }
    expect(() => weightedReadAloudCondition(prepared, { ...units(prepared), readers: [] }, "baseline", null, "intended_phones")).toThrow();
    const tiny = units(prepared); tiny.readers[0] = Number.MIN_VALUE; tiny.readers[1] = Number.MAX_VALUE;
    expect(() => weightedReadAloudCondition(prepared, tiny, "baseline", null, "intended_phones")).toThrow(/representable/);
  });
  it("axis scale changes leave point ratios unchanged", () => {
    const fixture = makeExport(comparison()), prepared = prepareReadAloudInference(fixture.data, fixture.materials);
    const first = { readers: [1, 2, 3, 4], spellings: [4, 3, 2, 1] };
    const second = { readers: first.readers.map(value => value * 1e100), spellings: first.spellings.map(value => value * 1e-100) };
    expect(weightedReadAloudCondition(prepared, first, "baseline", null, "intended_phones").agreement).toBeCloseTo(weightedReadAloudCondition(prepared, second, "baseline", null, "intended_phones").agreement!, 15);
  });
  it("uses the identical numerical kernel for authenticated reports and synthetic calibration", () => {
    for (const stress of ["primary", "unknown"] as const) {
      const fixture = makeExport(comparison(), () => ({ status: "coded", transcription: observed("a", stress) }));
      const prepared = prepareReadAloudInference(fixture.data, fixture.materials), authenticated = inferReadAloud(fixture.data, fixture.materials);
      const numerical = resampleReadAloud(prepared, protocol(), fixture.data.comparison.registration.strata.map(stratum => stratum.id));
      expect(numerical.results).toEqual(authenticated.results);
      expect(numerical.rng_integer_bin_hashes).toEqual(authenticated.rng_integer_bin_hashes);
      expect(numerical.rng_draws).toBe(authenticated.rng_draws);
    }
  });
  it("refuses repeated or absent numerical strata rather than duplicating a context", () => {
    const fixture = makeExport(comparison()), prepared = prepareReadAloudInference(fixture.data, fixture.materials);
    for (const strata of [[], ["all", "all"], [""]]) expect(() => resampleReadAloud(prepared, protocol(), strata)).toThrow(/unique registered strata/);
  });

});
