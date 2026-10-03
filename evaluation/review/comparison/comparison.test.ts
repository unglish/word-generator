import { describe, expect, it } from "vitest";
import { fixtureSnapshot } from "../fixtures.js";
import { RUBRIC } from "../protocol.js";
import { digest } from "../snapshot.js";
import { allocateComparison, reviewerPacket, validatePlan } from "./comparison-allocation.js";
import { freezeComparison, validateComparison } from "./comparison-freeze.js";
import { buildComparisonReport, validateComparisonExport } from "./comparison-report.js";
import type { ComparisonExport, ComparisonRegistration, Condition } from "./comparison-model.js";

const morphology = ["bare", "prefixed", "suffixed", "prefixed-and-suffixed", "applied-unspecified"] as const;
function registration(): ComparisonRegistration {
  return { version: "written-comparison-v1", study_id: "fixture-comparison", purpose: "development-fixture",
    candidate_selection: "Synthetic assignment fixtures, never human stimuli or outcome evidence.", population: "No participants: test slots only.",
    assignment_seed: 42, pairs_per_stratum: 1, session_length: 2, participant_slots: ["p1", "p2", "p3", "p4"],
    strata: [{ id: "short", lengths: [1, 4], syllables: [1, 10], morphology: [...morphology] },
      { id: "long", lengths: [5, 20], syllables: [1, 10], morphology: [...morphology] }] };
}
function comparison() {
  return freezeComparison(registration(), {
    baseline: fixtureSnapshot("fixture-baseline", ["aab", "abb", "abc", "shared", "longer", "growth", "growth"]),
    candidate: fixtureSnapshot("fixture-candidate", ["aac", "acc", "abc", "shared", "longest", "growing"]),
  });
}
function emptyExport(): ComparisonExport {
  const frozen = comparison();
  return { version: "written-comparison-export-v1", comparison: frozen, plan: allocateComparison(frozen), responses: [] };
}

describe("frozen baseline/candidate written comparisons", () => {
  it("retains every original draw and per-condition duplicate multiplicity", () => {
    const frozen = comparison(); validateComparison(frozen);
    expect(frozen.items.reduce((sum, item) => sum + item.draws.length, 0)).toBe(13);
    expect(frozen.items.find(item => item.spelling === "growth")?.draws.map(draw => draw.draw_index)).toEqual([5, 6]);
    expect(frozen.conditions.baseline.manifest.rubric).toEqual(RUBRIC);
    expect(frozen.items.filter(item => item.spelling === "shared")).toHaveLength(2);
  });
  it("rejects uncovered or multiply covered draws instead of filtering", () => {
    const frozen = comparison();
    const overlapping = registration(); overlapping.strata[1].lengths = [1, 20];
    expect(() => freezeComparison(overlapping, frozen.conditions)).toThrow("exactly one");
    const uncovered = registration(); uncovered.strata[0].lengths = [1, 2];
    expect(() => freezeComparison(uncovered, frozen.conditions)).toThrow("exactly one");
  });
  it("rejects invalid quotas, participant rosters and substituted source/rubric content", () => {
    const frozen = comparison();
    for (const mutate of [
      (r: ComparisonRegistration) => { r.participant_slots.pop(); },
      (r: ComparisonRegistration) => { r.participant_slots[1] = r.participant_slots[0]; },
      (r: ComparisonRegistration) => { r.session_length = 3; },
      (r: ComparisonRegistration) => { r.pairs_per_stratum = 0; },
    ]) { const value = registration(); mutate(value); expect(() => freezeComparison(value, frozen.conditions)).toThrow(); }
    const changed = structuredClone(frozen); changed.conditions.baseline.manifest.rubric.question = "Changed question";
    expect(() => validateComparison(changed)).toThrow();
    const changedSource = structuredClone(frozen); changedSource.conditions.candidate.manifest.generator.commit = "changed";
    expect(() => validateComparison(changedSource)).toThrow();
    const real = registration(); real.purpose = "human-study";
    expect(() => freezeComparison(real, frozen.conditions)).toThrow("committed generator sources");
  });
  it("rejects a resealed owner artifact with changed item labels or draw multiplicities", () => {
    const frozen = comparison();
    frozen.items[0].condition = frozen.items[0].condition === "baseline" ? "candidate" : "baseline";
    const { digest: oldDigest, ...content } = frozen;
    expect(oldDigest).not.toBe(digest(content)); frozen.digest = digest(content);
    expect(() => validateComparison(frozen)).toThrow("changed");
  });
});

describe("balanced participant plans", () => {
  it("is deterministic, balanced within strata, counterbalanced by position and repeat-free across sessions", () => {
    const frozen = comparison(), plan = allocateComparison(frozen);
    expect(allocateComparison(frozen)).toEqual(plan); validatePlan(frozen, plan);
    const byId = new Map(frozen.items.map(item => [item.id, item]));
    const positionConditions = new Map<number, Record<Condition, number>>();
    for (const participant of frozen.registration.participant_slots) {
      const sessions = plan.sessions.filter(session => session.participant_slot === participant);
      const items = sessions.flatMap(session => session.item_ids.map(id => byId.get(id)!));
      expect(new Set(items.map(item => item.spelling)).size).toBe(items.length);
      for (const stratum of frozen.registration.strata) for (const condition of ["baseline", "candidate"]) {
        expect(items.filter(item => item.stratum === stratum.id && item.condition === condition)).toHaveLength(1);
      }
      items.forEach((item, position) => {
        const counts = positionConditions.get(position) ?? { baseline: 0, candidate: 0 };
        counts[item.condition]++; positionConditions.set(position, counts);
      });
    }
    for (const counts of positionConditions.values()) expect(counts.baseline).toBe(counts.candidate);
    expect(plan.sessions).toHaveLength(8);
  });
  it("uses complete matching when a shared spelling can exhaust one arm", () => {
    for (let seed = 0; seed < 10; seed++) {
      const r = registration(); r.assignment_seed = seed; r.strata = [r.strata[0]];
      const frozen = freezeComparison(r, { baseline: fixtureSnapshot("match-baseline", ["same", "only"]),
        candidate: fixtureSnapshot("match-candidate", ["same"]) });
      const plan = allocateComparison(frozen), byId = new Map(frozen.items.map(item => [item.id, item]));
      for (const session of plan.sessions) expect(new Set(session.item_ids.map(id => byId.get(id)!.spelling))).toEqual(new Set(["same", "only"]));
    }
  });
  it("fails infeasible quotas without returning a partial or unbalanced plan", () => {
    const frozen = comparison(); frozen.registration.pairs_per_stratum = 4;
    const rebuilt = freezeComparison(frozen.registration, frozen.conditions);
    expect(() => allocateComparison(rebuilt)).toThrow("distinct spellings");
    const r = registration(); r.strata = [r.strata[0]];
    const collision = freezeComparison(r, { baseline: fixtureSnapshot("collision-baseline", ["same"]), candidate: fixtureSnapshot("collision-candidate", ["same"]) });
    expect(() => allocateComparison(collision)).toThrow("distinct spellings");
  });
  it("exports only the unchanged rubric, opaque item IDs and spellings", () => {
    const frozen = comparison(), plan = allocateComparison(frozen);
    const packet = reviewerPacket(frozen, plan, plan.sessions[0].id);
    expect(Object.keys(packet)).toEqual(["session_id", "assignment"]);
    expect(Object.keys(packet.assignment)).toEqual(["rubric", "items"]);
    expect(packet.assignment.rubric).toEqual(RUBRIC);
    for (const item of packet.assignment.items) {
      expect(Object.keys(item)).toEqual(["position", "sample_id", "spelling"]);
      expect(item.sample_id).toMatch(/^[a-f0-9]{64}$/);
    }
    plan.sessions[0].item_ids.reverse();
    expect(() => reviewerPacket(frozen, plan, plan.sessions[0].id)).toThrow("allocation changed");
  });
});

describe("condition/stratum/participant-aware descriptive exports", () => {
  it("keeps unobserved outcomes null and reports every missing assignment", () => {
    const report = buildComparisonReport(emptyExport());
    for (const group of report.groups) {
      expect(group.all.share_4_5).toBeNull(); expect(group.missing_responses).toBe(group.assignments);
    }
    expect(report.participant_contrasts.every(value => value.all.mean_candidate_minus_baseline === null)).toBe(true);
    expect(report.verified_distinct_people).toBeNull();
    for (const position of report.position_coverage) expect(position.missing).toBe(position.assigned);
    expect(report.purpose).toBe("development-fixture");
  });
  it("distinguishes skips, missingness, familiarity and incomplete within-slot pairs", () => {
    const data = emptyExport(), byId = new Map(data.comparison.items.map(item => [item.id, item]));
    const session = data.plan.sessions[0];
    data.responses = session.item_ids.map((item_id, position) => ({ id: `response-${position}`, item_id, session_id: session.id, position,
      answer: { status: "rated", rating: byId.get(item_id)!.condition === "baseline" ? 2 : 5, familiar: byId.get(item_id)!.condition === "candidate" } }));
    let report = buildComparisonReport(data);
    const participant = report.participant_contrasts.find(value => value.participant_slot === session.participant_slot && value.stratum === byId.get(session.item_ids[0])!.stratum)!;
    expect(participant.all.mean_candidate_minus_baseline).toBe(3);
    expect(participant.unfamiliar.mean_candidate_minus_baseline).toBeNull();
    data.responses[1].answer = { status: "skipped", rating: null, familiar: null };
    report = buildComparisonReport(data);
    expect(report.groups.filter(group => group.stratum === null).reduce((sum, group) => sum + group.skipped, 0)).toBe(1);
    expect(report.groups.filter(group => group.stratum === null).reduce((sum, group) => sum + group.missing_responses, 0)).toBe(14);
    expect(report.participant_contrasts.every(value => value.all.mean_candidate_minus_baseline === null)).toBe(true);
  });
  it("rejects duplicated IDs/positions, foreign items, altered allocations and invalid answers", () => {
    const base = emptyExport(), session = base.plan.sessions[0];
    base.responses.push({ id: "response", session_id: session.id, position: 0, item_id: session.item_ids[0], answer: { status: "rated", rating: 4, familiar: false } });
    for (const mutate of [
      (value: ComparisonExport) => { value.responses.push(value.responses[0]); },
      (value: ComparisonExport) => { value.responses.push({ ...value.responses[0], id: "other" }); },
      (value: ComparisonExport) => { value.responses[0].item_id = "foreign"; },
      (value: ComparisonExport) => { value.responses[0].position = 99; },
      (value: ComparisonExport) => { value.responses[0].answer = { status: "rated", rating: 6, familiar: false }; },
      (value: ComparisonExport) => { value.plan.sessions[0].participant_slot = "other"; },
    ]) { const data = structuredClone(base); mutate(data); expect(() => validateComparisonExport(data)).toThrow(); }
  });
});
