import { describe, expect, it } from "vitest";
import { fixtureSnapshot } from "../fixtures.js";
import { digest } from "../snapshot.js";
import { allocateComparison } from "./comparison-allocation.js";
import { freezeComparison } from "./comparison-freeze.js";
import { inferWrittenComparison, percentile, prepareInference, weightedCondition } from "./comparison-inference.js";
import { validateEnrollment, validateInferenceProtocol } from "./inference-protocol.js";
import type { ComparisonExport, ComparisonRegistration } from "./comparison-model.js";
import type { PreparedInference } from "./comparison-inference.js";
import type { EnrollmentRoster, WrittenInferenceProtocol } from "./inference-model.js";

function protocol(): WrittenInferenceProtocol {
  return { version: "written-crossed-bootstrap-v2", metric: "share-4-5", cohort: "all-ratings", seed: 20261002,
    replicates: 40, confidence: .95, minimum_rated_participants: 2, minimum_spellings_per_condition: 2,
    minimum_draw_coverage: .01, participant_sampling_assumption: "Synthetic people only: no population inference.",
    spelling_sampling_assumption: "Synthetic spelling pool only: arithmetic validation.", missingness_assumption: "Fixture missingness, never real attrition." };
}
function fixture(): ComparisonExport {
  const registration: ComparisonRegistration = { version: "written-comparison-v1", study_id: "inference-fixture", purpose: "development-fixture",
    candidate_selection: "Synthetic fixtures; no observed treatment or human gain.", population: "No people recruited.",
    assignment_seed: 42, pairs_per_stratum: 2, session_length: 4, participant_slots: Array.from({ length: 8 }, (_, index) => `p${index}`),
    strata: [{ id: "all", lengths: [1, 100], syllables: [1, 10], morphology: ["bare", "prefixed", "suffixed", "prefixed-and-suffixed", "applied-unspecified"] }],
    inference: protocol() };
  const comparison = freezeComparison(registration, {
    baseline: fixtureSnapshot("inference-baseline", ["same", "basea", "baseb", "basec", "basec"]),
    candidate: fixtureSnapshot("inference-candidate", ["same", "canda", "candb", "candc"]) });
  const plan = allocateComparison(comparison);
  const responses = plan.sessions.flatMap((session, index) => session.item_ids.map((item_id, position) => ({
    id: `r${index}-${position}`, session_id: session.id, position, item_id,
    answer: { status: "rated" as const, rating: 1 + (index + position) % 5, familiar: (index + position) % 7 === 0 } })));
  return { version: "written-comparison-export-v1", comparison, plan, responses };
}
function roster(data: ComparisonExport): EnrollmentRoster {
  const content = { version: "written-enrollment-v1" as const, comparison_digest: data.comparison.digest,
    verification_method: "Synthetic roster fixture, no actual people.", entries: data.comparison.registration.participant_slots.map((participant_slot, index) => ({
      participant_slot, person_key: `person-${index}`, verification_record_sha256: digest(["fixture", index]) })) };
  return { ...content, digest: digest(content) };
}

describe("crossed participant/spelling weighting", () => {
  it("uses fixed eligible-rating counts and preserves original draw multiplicity", () => {
    const prepared: PreparedInference = { identity_basis: "development-fixture", factors: { participants: ["a", "b", "c"], spellings: ["x", "y", "z"] },
      items: [{ id: "bx", condition: "baseline", stratum: "all", spelling: 0, draws: 2, ratings: [{ participant: 0, favorable: 1 }, { participant: 1, favorable: 0 }] },
        { id: "by", condition: "baseline", stratum: "all", spelling: 1, draws: 1, ratings: [{ participant: 2, favorable: 0 }] },
        { id: "cx", condition: "candidate", stratum: "all", spelling: 0, draws: 1, ratings: [{ participant: 2, favorable: 1 }] },
        { id: "cz", condition: "candidate", stratum: "all", spelling: 2, draws: 1, ratings: [{ participant: 0, favorable: 1 }] }] };
    expect(weightedCondition(prepared, { participants: [1, 1, 1], spellings: [1, 1, 1] }, "baseline", null).share_4_5).toBeCloseTo(1 / 3);
    const weights = { participants: [3, 1, 2], spellings: [2, 1, 1] };
    expect(weightedCondition(prepared, weights, "baseline", null).share_4_5).toBeCloseTo(.6);
    expect(weightedCondition(prepared, weights, "candidate", null).share_4_5).toBe(1);
    for (const invalid of [
      { participants: [3, 0, 2], spellings: [2, 1, 1] },
      { participants: [3, 1, 2], spellings: [2, 1] },
      { participants: [Infinity, 1, 2], spellings: [2, 1, 1] },
    ]) expect(() => weightedCondition(prepared, invalid, "baseline", null)).toThrow();
  });
  it("rescales factor axes without changing finite extreme-weight favorable shares", () => {
    const prepared: PreparedInference = { identity_basis: "development-fixture",
      factors: { participants: ["reader"], spellings: ["word"] },
      items: [{ id: "item", condition: "baseline", stratum: "all", spelling: 0, draws: 2,
        ratings: [{ participant: 0, favorable: 1 }] }] };
    expect(weightedCondition(prepared, { participants: [Number.MAX_VALUE], spellings: [1] }, "baseline", null).share_4_5).toBe(1);
    expect(weightedCondition(prepared, { participants: [Number.MIN_VALUE], spellings: [Number.MIN_VALUE] }, "baseline", null).share_4_5).toBe(1);
  });
  it("keeps reader uncertainty when each item has only one eligible rating", () => {
    const prepared: PreparedInference = { identity_basis: "development-fixture",
      factors: { participants: ["reader-a", "reader-b"], spellings: ["word-a", "word-b"] },
      items: [{ id: "a", condition: "baseline", stratum: "all", spelling: 0, draws: 1, ratings: [{ participant: 0, favorable: 1 }] },
        { id: "b", condition: "baseline", stratum: "all", spelling: 1, draws: 1, ratings: [{ participant: 1, favorable: 0 }] }] };
    expect(weightedCondition(prepared, { participants: [1, 1], spellings: [1, 1] }, "baseline", null).share_4_5).toBe(.5);
    expect(weightedCondition(prepared, { participants: [3, 1], spellings: [1, 1] }, "baseline", null).share_4_5).toBe(.75);
    expect(weightedCondition(prepared, { participants: [Number.MAX_VALUE, Number.MAX_VALUE], spellings: [1, 1] }, "baseline", null).share_4_5).toBe(.5);
    expect(() => weightedCondition(prepared, { participants: [Number.MAX_VALUE, Number.MIN_VALUE], spellings: [1, 1] }, "baseline", null)).toThrow("representable");
  });
  it("uses one global factor for a spelling shared across conditions", () => {
    const data = fixture(), prepared = prepareInference(data, data.comparison.registration.inference!);
    expect(prepared.factors.spellings.filter(value => value === "same")).toHaveLength(1);
    const shared = prepared.items.filter(item => item.id === data.comparison.items.find(value => value.spelling === "same" && value.condition === item.condition)?.id);
    expect(shared).toHaveLength(2); expect(shared[0].spelling).toBe(shared[1].spelling);
  });
  it("retains deterministic full bootstrap values and every integer-bin hash", () => {
    const data = fixture(), first = inferWrittenComparison(data);
    expect(inferWrittenComparison(data)).toEqual(first);
    expect(first.purpose).toBe("development-fixture");
    expect(first.rng_integer_bin_hashes).toHaveLength(40);
    expect(first.rng_draws).toBe(40 * (first.factors.participants.length + first.factors.spellings.length));
    expect(first.results.every(context => context.replicates.length === 40)).toBe(true);
  });
  it("keeps absent scores null and withholds rather than retries unavailable intervals", () => {
    const data = fixture(); data.responses = [];
    const result = inferWrittenComparison(data);
    for (const context of result.results) {
      expect(context.point.candidate_minus_baseline).toBeNull(); expect(context.interval).toBeNull();
      expect(context.unavailable_replicates).toBe(40); expect(context.valid_replicates).toBe(0);
    }
    expect(result.rng_integer_bin_hashes).toHaveLength(40);
  });
  it("excludes familiarity only under the frozen cohort rule and retains skipped/missing items", () => {
    const data = fixture();
    const configuration = structuredClone(data.comparison.registration); configuration.inference!.cohort = "unfamiliar-only";
    const comparison = freezeComparison(configuration, data.comparison.conditions), plan = allocateComparison(comparison);
    const unfamiliar: ComparisonExport = { ...data, comparison, plan, responses: plan.sessions.flatMap(session => session.item_ids.map((item_id, position) => ({
      id: `${session.id}-${position}`, session_id: session.id, position, item_id,
      answer: { status: "rated" as const, rating: 5, familiar: true } }))) };
    expect(inferWrittenComparison(unfamiliar).results[0].point.candidate_minus_baseline).toBeNull();
    data.responses[0].answer = { status: "rated", rating: 5, familiar: false };
    const prepared = prepareInference(data, data.comparison.registration.inference!);
    expect(prepared.items.reduce((sum, item) => sum + item.ratings.length, 0)).toBe(data.responses.length);
  });
});

describe("preregistered inference and enrollment bindings", () => {
  it("rejects changed inference settings after the comparison was frozen", () => {
    const data = fixture(), changed = protocol(); changed.seed++;
    expect(() => prepareInference(data, changed)).toThrow("frozen before observations");
    delete data.comparison.registration.inference;
    expect(() => inferWrittenComparison(data)).toThrow("Freeze an inference protocol");
    for (const invalid of [{ ...protocol(), confidence: 1 }, { ...protocol(), replicates: 0 }, { ...protocol(), missingness_assumption: "" }]) {
      expect(() => validateInferenceProtocol(invalid)).toThrow();
    }
  });
  it("rejects duplicate people/slots/verification records, foreign or incomplete rosters and changed content", () => {
    const data = fixture(), valid = roster(data); validateEnrollment(data.comparison, valid);
    for (const mutate of [
      (value: EnrollmentRoster) => { value.entries[1].person_key = value.entries[0].person_key; },
      (value: EnrollmentRoster) => { value.entries[1].participant_slot = value.entries[0].participant_slot; },
      (value: EnrollmentRoster) => { value.entries[1].verification_record_sha256 = value.entries[0].verification_record_sha256; },
      (value: EnrollmentRoster) => { value.entries.pop(); },
      (value: EnrollmentRoster) => { value.comparison_digest = "foreign"; },
      (value: EnrollmentRoster) => { value.verification_method = "changed"; },
    ]) { const value = structuredClone(valid); mutate(value); expect(() => validateEnrollment(data.comparison, value)).toThrow(); }
    const prepared = prepareInference(data, data.comparison.registration.inference!, valid);
    expect(prepared.identity_basis).toBe("owner-attested-enrollment");
    expect(prepared.factors.participants).toEqual(valid.entries.map(entry => entry.person_key).sort());
  });
  it("uses the declared linear percentile rule without mutating replicate values", () => {
    const values = [1, 0, .5]; expect(percentile(values, .25)).toBe(.25); expect(values).toEqual([1, 0, .5]);
    expect(percentile(values, 0)).toBe(0); expect(percentile(values, 1)).toBe(1);
    expect(() => percentile([], .5)).toThrow(); expect(() => percentile([NaN], .5)).toThrow();
  });
});
