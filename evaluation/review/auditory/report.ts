import { validAnswer } from "../protocol.js";
import { validateRelease } from "./audio.js";
import { validateAuditoryPlan } from "./allocation.js";
import type { AuditoryExport, AuditoryItem, AuditoryResponse } from "./model.js";

export function validateAuditoryExport(data: AuditoryExport): void {
  if (data.version !== "auditory-export-v1") throw new Error("Unsupported auditory export.");
  validateRelease(data.comparison, data.release);
  validateAuditoryPlan(data.comparison, data.plan);
  const sessions = new Map(data.plan.sessions.map(session => [session.id, session]));
  const items = new Map(data.comparison.items.map(item => [item.id, item]));
  const assets = new Map(data.release.assets.map(asset => [asset.target_digest, asset]));
  const ids = new Set<string>(), positions = new Set<string>();
  for (const response of data.responses) {
    const key = `${response.session_id}:${response.position}`, item = items.get(response.item_id);
    if (typeof response.id !== "string" || !response.id || !validAnswer(response.answer) ||
        typeof response.played_complete !== "boolean" || (response.answer.status === "rated" && !response.played_complete) ||
        !Number.isSafeInteger(response.position) || response.position < 0 || !item ||
        sessions.get(response.session_id)?.item_ids[response.position] !== response.item_id ||
        assets.get(item.target.digest)?.audio.sha256 !== response.audio_sha256 || ids.has(response.id) || positions.has(key)) {
      throw new Error("Invalid, unplayed, misbound or duplicate auditory response.");
    }
    ids.add(response.id); positions.add(key);
  }
}

function rated(responses: AuditoryResponse[], unfamiliar: boolean): AuditoryResponse[] {
  return responses.filter(response => response.answer.status === "rated" && (!unfamiliar || !response.answer.familiar));
}
function distribution(items: AuditoryItem[], byItem: Map<string, AuditoryResponse[]>, unfamiliar: boolean) {
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
    share_4_5: coveredDraws ? (totals[3] + totals[4]) / coveredDraws : null };
}

export function buildAuditoryReport(data: AuditoryExport) {
  validateAuditoryExport(data);
  const { comparison, plan } = data;
  const items = new Map(comparison.items.map(item => [item.id, item]));
  const byItem = new Map<string, AuditoryResponse[]>(), byPosition = new Map<string, AuditoryResponse>();
  for (const response of data.responses) {
    const bucket = byItem.get(response.item_id) ?? []; bucket.push(response); byItem.set(response.item_id, bucket);
    byPosition.set(`${response.session_id}:${response.position}`, response);
  }
  const groups = (["baseline", "candidate"] as const).flatMap(condition => [null, ...comparison.registration.strata.map(value => value.id)].map(stratum => {
    const pool = comparison.items.filter(item => item.condition === condition && (stratum === null || item.stratum === stratum));
    const poolIds = new Set(pool.map(item => item.id));
    const assignments = plan.sessions.reduce((sum, session) => sum + session.item_ids.filter(id => poolIds.has(id)).length, 0);
    const responses = data.responses.filter(response => poolIds.has(response.item_id)), ratings = rated(responses, false);
    return { condition, stratum, pool_items: pool.length, assignments, received_responses: responses.length,
      missing: assignments - responses.length, skipped: responses.filter(response => response.answer.status === "skipped").length,
      skipped_before_complete_playback: responses.filter(response => response.answer.status === "skipped" && !response.played_complete).length,
      familiar: ratings.filter(response => response.answer.status === "rated" && response.answer.familiar).length,
      all: distribution(pool, byItem, false), unfamiliar: distribution(pool, byItem, true) };
  }));
  const participantContrasts = comparison.registration.participant_slots.flatMap(participant => comparison.registration.strata.map(stratum => {
    const pairs: { all: number | null; unfamiliar: number | null }[] = [];
    for (const session of plan.sessions.filter(value => value.participant_slot === participant)) {
      for (let position = 0; position < session.item_ids.length; position += 2) {
        const pairItems = session.item_ids.slice(position, position + 2).map(id => items.get(id)!);
        if (pairItems[0].stratum !== stratum.id) continue;
        const responses = pairItems.map((_, index) => byPosition.get(`${session.id}:${position + index}`));
        const baseline = responses[pairItems[0].condition === "baseline" ? 0 : 1];
        const candidate = responses[pairItems[0].condition === "candidate" ? 0 : 1];
        let all: number | null = null, unfamiliar: number | null = null;
        if (baseline?.answer.status === "rated" && candidate?.answer.status === "rated") {
          all = candidate.answer.rating - baseline.answer.rating;
          if (!baseline.answer.familiar && !candidate.answer.familiar) unfamiliar = all;
        }
        pairs.push({ all, unfamiliar });
      }
    }
    function summarize(key: "all" | "unfamiliar") {
      const values = pairs.map(pair => pair[key]).filter((value): value is number => value !== null);
      return { complete_pairs: values.length, incomplete_pairs: pairs.length - values.length,
        mean_candidate_minus_baseline: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null };
    }
    return { participant_slot: participant, stratum: stratum.id, planned_pairs: pairs.length, all: summarize("all"), unfamiliar: summarize("unfamiliar") };
  }));
  return { version: "auditory-report-v1", comparison_digest: comparison.digest, release_digest: data.release.digest, plan_digest: plan.digest,
    purpose: comparison.registration.purpose, rubric_version: "auditory-wordlikeness-v1", verified_distinct_people: null,
    groups, participant_contrasts: participantContrasts,
    item_coverage: comparison.items.map(item => ({ item_id: item.id, target_digest: item.target.digest, condition: item.condition,
      stratum: item.stratum, original_draws: item.draws.length, ratings: rated(byItem.get(item.id) ?? [], false).length })),
    position_coverage: plan.sessions.flatMap(session => session.item_ids.map((id, position) => ({
      participant_slot: session.participant_slot, ordinal: session.ordinal, position, item_id: id,
      condition: items.get(id)!.condition, stratum: items.get(id)!.stratum,
      status: byPosition.get(`${session.id}:${position}`)?.answer.status ?? "missing",
    }))),
    scope: "Descriptive frozen-cohort auditory distributions and within-slot contrasts only. Slots and playback flags are recorded claims, not verified people or attention. Production/transcription attestations do not prove their truth. No calibrated population interval, causal fixed-phone contrast, multiple-speaker generalization or actual-human quality claim. Unfamiliar responses define a post-presentation cohort and may differ by condition." };
}
