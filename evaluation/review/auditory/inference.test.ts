import { describe, expect, it } from "vitest";
import { digest } from "../snapshot.js";
import { freezeAuditory, validateAuditory } from "./freeze.js";
import { freezeAuditoryRoster, validateAuditoryInference } from "./inference-protocol.js";
import { inferAuditory, prepareAuditoryInference, resampleAuditory, weightedAuditoryCondition } from "./inference.js";
import type { PreparedAuditoryInference } from "./inference.js";
import { AUDITORY_INFERENCE_CASES, auditoryInferenceFixture, inferenceProtocol } from "./inference.fixture.js";
import { buildAuditoryReport } from "./report.js";

describe("prospective auditory listener and target stability", () => {
  it("rejects invalid protocol values during freezing before observations", () => {
    const { data } = auditoryInferenceFixture();
    for (const change of [{ seed: -1 }, { replicates: 1 }, { minimum_rated_targets_per_condition: 1 }, { confidence: 1 },
      { minimum_draw_coverage: 0 }, { target_sampling_assumption: "" }]) {
      expect(() => freezeAuditory({ ...data.comparison.registration, inference: { ...inferenceProtocol(), ...change } }, data.comparison.conditions)).toThrow("protocol");
    }
  });
  it("preserves the existing no-protocol comparison and descriptive report contracts", () => {
    const { data } = auditoryInferenceFixture();
    const registration = { ...data.comparison.registration }; delete registration.inference;
    const comparison = freezeAuditory(registration, data.comparison.conditions);
    validateAuditory(comparison);
    expect(comparison.registration.inference).toBeUndefined();
    expect(() => validateAuditoryInference(undefined!)).toThrow("protocol");
  });
  it("requires every original material before constructing inference, including irrelevant-to-rating assets", () => {
    const { data, materials, roster } = auditoryInferenceFixture("all-missing");
    expect(() => inferAuditory(data, materials.slice(1), roster)).toThrow();
    const changed = structuredClone(materials); changed[0].wav[45] ^= 1;
    expect(() => inferAuditory(data, changed, roster)).toThrow();
    const transcriptionChanged = structuredClone(materials); transcriptionChanged[0].verification![0].transcription_file[0] ^= 1;
    expect(() => inferAuditory(data, transcriptionChanged, roster)).toThrow();
    expect(() => inferAuditory({ ...data, release: { ...data.release, digest: "0".repeat(64) } }, materials, roster)).toThrow();
  });
  it("requires distinct complete roster records and the current comparison binding", () => {
    const { data, materials, roster } = auditoryInferenceFixture();
    const changed = structuredClone(roster); changed.entries[1].person_key = changed.entries[0].person_key;
    expect(() => freezeAuditoryRoster(data.comparison, changed.verification_method, changed.entries)).toThrow("distinct");
    expect(() => inferAuditory(data, materials, { ...roster, digest: digest("wrong") })).toThrow("roster changed");
    expect(prepareAuditoryInference(data, materials).identity_basis).toBe("development-fixture");
  });
  it("uses pronunciation targets across arms and spellings, retaining each arm's original multiplicity", () => {
    const { data, materials, roster } = auditoryInferenceFixture("shared-targets");
    const prepared = prepareAuditoryInference(data, materials, roster);
    expect(prepared.factors.targets).toHaveLength(4);
    expect(prepared.items.reduce((sum, item) => sum + item.draws, 0)).toBe(7);
    const repeated = prepared.items.find(item => item.draws === 2)!;
    expect(prepared.items.some(item => item.condition === "candidate" && item.target === repeated.target)).toBe(true);
  });
  it("keeps stress and syllable identity distinct even when flattened phones coincide", () => {
    const { data, materials, roster } = auditoryInferenceFixture("stress-boundary");
    const variants = data.comparison.items.filter(item => item.target.syllables.length === 2);
    expect(variants).toHaveLength(2);
    expect(variants[0].target.syllables.flatMap(syllable => syllable.phones)).toEqual(variants[1].target.syllables.flatMap(syllable => syllable.phones));
    expect(variants[0].target.digest).not.toBe(variants[1].target.digest);
    expect(prepareAuditoryInference(data, materials, roster).factors.targets).toHaveLength(4);
  });
  it("matches original-draw descriptive shares at unit weights for both cohorts", () => {
    const { data, materials, roster } = auditoryInferenceFixture("unfamiliar-selection");
    const prepared = prepareAuditoryInference(data, materials, roster), report = buildAuditoryReport(data);
    const weights = { listeners: prepared.factors.listeners.map(() => 1), targets: prepared.factors.targets.map(() => 1) };
    for (const condition of ["baseline", "candidate"] as const) for (const cohort of ["all-ratings", "unfamiliar-only"] as const) {
      const expected = report.groups.find(group => group.condition === condition && group.stratum === null)!;
      expect(weightedAuditoryCondition(prepared, weights, condition, null, cohort).share_4_5).toBeCloseTo((cohort === "all-ratings" ? expected.all : expected.unfamiliar).share_4_5!);
    }
  });
  it("does not normalize listener weights away inside each target", () => {
    const prepared: PreparedAuditoryInference = { factors: { listeners: ["l0", "l1"], targets: ["t0", "t1"] }, identity_basis: "development-fixture",
      items: [{ id: "one", condition: "baseline", stratum: "all", target: 0, draws: 2, ratings: [{ listener: 0, favorable: 1, familiar: false }] },
        { id: "two", condition: "baseline", stratum: "all", target: 1, draws: 1, ratings: [{ listener: 1, favorable: 0, familiar: false }] }] };
    const weights = { listeners: [3, 1], targets: [2, 1] };
    expect(weightedAuditoryCondition(prepared, weights, "baseline", null, "all-ratings").share_4_5).toBeCloseTo(12 / 13);
    expect(weightedAuditoryCondition(prepared, { listeners: [30, 10], targets: [20, 10] }, "baseline", null, "all-ratings")).toEqual(weightedAuditoryCondition(prepared, weights, "baseline", null, "all-ratings"));
  });
  it("rejects nonpositive, nonfinite and mismatched factors", () => {
    const { data, materials } = auditoryInferenceFixture();
    const prepared = prepareAuditoryInference(data, materials);
    for (const listeners of [[], [0, 1, 1, 1], [Infinity, 1, 1, 1], [NaN, 1, 1, 1]]) {
      expect(() => weightedAuditoryCondition(prepared, { listeners, targets: [1, 1, 1, 1] }, "baseline", null, "all-ratings")).toThrow("factor");
    }
  });
  it.each(AUDITORY_INFERENCE_CASES)("retains deterministic complete outputs for %s", kind => {
    const { data, materials, roster } = auditoryInferenceFixture(kind);
    const report = inferAuditory(data, materials, roster);
    expect(inferAuditory(data, materials, roster)).toEqual(report);
    expect(report.calibration).toBe("not-established"); expect(report.population_intervals).toBeNull();
    expect(report.results).toHaveLength(4); expect(report.results.filter(result => result.primary)).toHaveLength(1);
    expect(report.rng_integer_bin_hashes).toHaveLength(31);
    expect(report.rng_draws).toBe(31 * (report.factors.listeners.length + report.factors.targets.length));
    expect(report.results.every(result => result.replicates.length === 31)).toBe(true);
    expect(resampleAuditory(prepareAuditoryInference(data, materials, roster), data.comparison.registration.inference!, ["all"]).results).toEqual(report.results);
  });
  it("retains all-familiar and all-missing cohorts with null contrasts and unavailable replicates", () => {
    const { data, materials, roster } = auditoryInferenceFixture("all-familiar");
    const result = inferAuditory(data, materials, roster).results.find(value => value.cohort === "unfamiliar-only" && value.stratum === null)!;
    expect(result.point.candidate_minus_baseline).toBeNull(); expect(result.replicates).toEqual(Array(31).fill(null));
    expect(result.stability_interval).toBeNull(); expect(result.interval_withheld_reasons).toContain("unavailable replicates retained");
    expect(result.point.baseline.pool_draws).toBe(4); expect(result.point.baseline.covered_draws).toBe(0);
  });
  it("withholds exploratory and primary endpoints without discarding sparse replicates", () => {
    const { data, materials, roster } = auditoryInferenceFixture("sparse-gates");
    const report = inferAuditory(data, materials, roster);
    expect(report.results.every(result => result.stability_interval === null && result.replicates.every(value => value !== null))).toBe(true);
    expect(() => resampleAuditory(prepareAuditoryInference(data, materials, roster), data.comparison.registration.inference!, ["all", "all"])).toThrow("unique");
  });
});
