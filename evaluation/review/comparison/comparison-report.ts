import { validAnswer } from "../protocol.js";
import { validatePlan } from "./comparison-allocation.js";
import { CONDITIONS } from "./comparison-freeze.js";
import type { ComparisonExport, ComparisonItem, ComparisonResponse, Condition } from "./comparison-model.js";

export function validateComparisonExport(data: ComparisonExport): void {
  if (data.version !== "written-comparison-export-v1") throw new Error("Unsupported comparison export.");
  validatePlan(data.comparison, data.plan);
  const sessions = new Map(data.plan.sessions.map(session => [session.id, session]));
  const ids = new Set<string>(), positions = new Set<string>();
  for (const response of data.responses) {
    const key = `${response.session_id}:${response.position}`;
    if (typeof response.id !== "string" || !response.id || !validAnswer(response.answer) ||
        !Number.isSafeInteger(response.position) || response.position < 0 ||
        sessions.get(response.session_id)?.item_ids[response.position] !== response.item_id ||
        ids.has(response.id) || positions.has(key)) throw new Error("Invalid or duplicate comparison response.");
    ids.add(response.id); positions.add(key);
  }
}
function rated(responses: ComparisonResponse[], unfamiliar: boolean): ComparisonResponse[] {
  return responses.filter(response => response.answer.status === "rated" && (!unfamiliar || !response.answer.familiar));
}
function distribution(items: ComparisonItem[], byItem: Map<string, ComparisonResponse[]>, unfamiliar: boolean) {
  const totals = [0, 0, 0, 0, 0];
  let coveredDraws = 0, coveredItems = 0, ratings = 0;
  for (const item of items) {
    const responses = rated(byItem.get(item.id) ?? [], unfamiliar);
    if (!responses.length) continue;
    const counts = [0, 0, 0, 0, 0];
    for (const response of responses) if (response.answer.status === "rated") counts[response.answer.rating - 1]++;
    counts.forEach((count, index) => { totals[index] += item.draws.length * count / responses.length; });
    coveredDraws += item.draws.length; coveredItems++; ratings += responses.length;
  }
  return { rated_responses: ratings, covered_items: coveredItems, covered_draws: coveredDraws,
    pool_draws: items.reduce((sum, item) => sum + item.draws.length, 0),
    proportions: totals.map(value => coveredDraws ? value / coveredDraws : null),
    share_4_5: coveredDraws ? (totals[3] + totals[4]) / coveredDraws : null,
    share_1_2: coveredDraws ? (totals[0] + totals[1]) / coveredDraws : null };
}
function contrast(a: ComparisonResponse | undefined, b: ComparisonResponse | undefined, unfamiliar: boolean): number | null {
  if (a?.answer.status !== "rated" || b?.answer.status !== "rated" ||
      (unfamiliar && (a.answer.familiar || b.answer.familiar))) return null;
  return b.answer.rating - a.answer.rating;
}
export function buildComparisonReport(data: ComparisonExport) {
  validateComparisonExport(data);
  const comparison = data.comparison;
  const items = new Map(comparison.items.map(item => [item.id, item]));
  const byItem = new Map<string, ComparisonResponse[]>(), byPosition = new Map<string, ComparisonResponse>();
  for (const response of data.responses) {
    const bucket = byItem.get(response.item_id) ?? []; bucket.push(response); byItem.set(response.item_id, bucket);
    byPosition.set(`${response.session_id}:${response.position}`, response);
  }
  const groups = CONDITIONS.flatMap(condition => [null, ...comparison.registration.strata.map(stratum => stratum.id)].map(stratum => {
    const pool = comparison.items.filter(item => item.condition === condition && (stratum === null || item.stratum === stratum));
    const poolIds = new Set(pool.map(item => item.id));
    const assignments = data.plan.sessions.reduce((sum, session) => sum + session.item_ids.filter(id => poolIds.has(id)).length, 0);
    const responses = data.responses.filter(response => poolIds.has(response.item_id));
    const ratings = rated(responses, false);
    return { condition, stratum, pool_items: pool.length, assignments, received_responses: responses.length,
      missing_responses: assignments - responses.length, skipped: responses.filter(response => response.answer.status === "skipped").length,
      familiar: ratings.filter(response => response.answer.status === "rated" && response.answer.familiar).length,
      rated: ratings.length, all: distribution(pool, byItem, false), unfamiliar: distribution(pool, byItem, true) };
  }));
  const participantContrasts = comparison.registration.participant_slots.flatMap(participant => comparison.registration.strata.map(stratum => {
    const pairs: { all: number | null; unfamiliar: number | null }[] = [];
    for (const session of data.plan.sessions.filter(value => value.participant_slot === participant)) {
      for (let position = 0; position < session.item_ids.length; position += 2) {
        const pairItems = session.item_ids.slice(position, position + 2).map(id => items.get(id)!);
        if (pairItems[0].stratum !== stratum.id) continue;
        const ordered: Partial<Record<Condition, ComparisonResponse>> = {};
        pairItems.forEach((item, index) => { ordered[item.condition] = byPosition.get(`${session.id}:${position + index}`); });
        pairs.push({ all: contrast(ordered.baseline, ordered.candidate, false),
          unfamiliar: contrast(ordered.baseline, ordered.candidate, true) });
      }
    }
    const summarize = (key: "all" | "unfamiliar") => {
      const values = pairs.map(pair => pair[key]).filter((value): value is number => value !== null);
      return { complete_pairs: values.length, incomplete_pairs: pairs.length - values.length,
        mean_candidate_minus_baseline: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null };
    };
    return { participant_slot: participant, stratum: stratum.id, planned_pairs: pairs.length, all: summarize("all"), unfamiliar: summarize("unfamiliar") };
  }));
  const positionCoverage = new Map<string, { condition: Condition; stratum: string; presentation_position: number;
    assigned: number; rated: number; skipped: number; missing: number }>();
  for (const session of data.plan.sessions) session.item_ids.forEach((id, position) => {
    const item = items.get(id)!, presentation = session.ordinal * comparison.registration.session_length + position;
    const key = `${item.condition}:${item.stratum}:${presentation}`;
    const row = positionCoverage.get(key) ?? { condition: item.condition, stratum: item.stratum,
      presentation_position: presentation, assigned: 0, rated: 0, skipped: 0, missing: 0 };
    row.assigned++;
    const response = byPosition.get(`${session.id}:${position}`);
    if (!response) row.missing++;
    else if (response.answer.status === "rated") row.rated++;
    else row.skipped++;
    positionCoverage.set(key, row);
  });
  return { version: "written-comparison-report-v1", comparison_digest: comparison.digest, plan_digest: data.plan.digest,
    purpose: comparison.registration.purpose, participant_slots: comparison.registration.participant_slots.length,
    verified_distinct_people: null, groups, participant_contrasts: participantContrasts, position_coverage: [...positionCoverage.values()],
    item_coverage: comparison.items.map(item => ({ item_id: item.id, condition: item.condition, stratum: item.stratum,
      spelling: item.spelling, original_draws: item.draws.length, ratings: rated(byItem.get(item.id) ?? [], false).length })),
    scope: "Descriptive frozen-cohort item/draw-weighted score distributions and within-slot paired contrasts only. Slots are not verified people; synthetic fixtures are not human observations. Missing/skipped/familiar responses remain explicit. No population confidence interval or speaker-preference proof." };
}
