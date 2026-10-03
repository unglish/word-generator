import { digest } from "../snapshot.js";
import type { ComparisonPlan, Condition, PlannedSession } from "../comparison/comparison-model.js";
import { validateRelease } from "./audio.js";
import { validateAuditory } from "./freeze.js";
import { AUDITORY_RUBRIC } from "./protocol.js";
import type { AuditoryComparison, AuditoryItem, AuditoryPacket, AuditoryRelease } from "./model.js";

interface Slot { condition: Condition; stratum: string; candidates: AuditoryItem[] }
function compareKeys(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }

function slotsFor(comparison: AuditoryComparison, participantIndex: number, uses: Map<string, number>): Slot[] {
  const registration = comparison.registration, slots: Slot[] = [];
  const participant = registration.participant_slots[participantIndex];
  for (let stratumIndex = 0; stratumIndex < registration.strata.length; stratumIndex++) {
    const stratum = registration.strata[stratumIndex].id;
    for (let pair = 0; pair < registration.pairs_per_stratum; pair++) {
      const order: Condition[] = (participantIndex + stratumIndex + pair) % 2 ? ["candidate", "baseline"] : ["baseline", "candidate"];
      for (const condition of order) {
        const candidates = comparison.items.filter(item => item.condition === condition && item.stratum === stratum);
        candidates.sort((a, b) => (uses.get(a.id) ?? 0) - (uses.get(b.id) ?? 0) ||
          compareKeys(digest([registration.assignment_seed, participant, stratum, pair, a.id]),
            digest([registration.assignment_seed, participant, stratum, pair, b.id])));
        slots.push({ condition, stratum, candidates });
      }
    }
  }
  return slots;
}

// Matching uses pronunciation identity, including stress, across all sessions.
// An augmenting path can move an earlier choice to preserve a later arm's quota.
function matchTargets(slots: Slot[]): AuditoryItem[] {
  const assigned = new Map<string, number>(), choices = new Map<number, AuditoryItem>();
  function assign(index: number, visited: Set<string>): boolean {
    for (const item of slots[index].candidates) {
      const identity = item.target.digest;
      if (visited.has(identity)) continue;
      visited.add(identity);
      const previous = assigned.get(identity);
      if (previous === undefined || assign(previous, visited)) {
        assigned.set(identity, index); choices.set(index, item); return true;
      }
    }
    return false;
  }
  for (let index = 0; index < slots.length; index++) {
    if (!assign(index, new Set())) throw new Error(`Insufficient distinct auditory targets for ${slots[index].condition}/${slots[index].stratum}; no fallback allocation.`);
  }
  return slots.map((_, index) => choices.get(index)!);
}

export function allocateAuditory(comparison: AuditoryComparison): ComparisonPlan {
  validateAuditory(comparison);
  if (comparison.draws.some(draw => draw.assessment.status === "unresolved")) throw new Error("Unresolved source targets block allocation; no filtering.");
  const sessions: PlannedSession[] = [], uses = new Map<string, number>(), registration = comparison.registration;
  const quota = 2 * registration.strata.length * registration.pairs_per_stratum;
  if (!Number.isSafeInteger(quota) || quota > new Set(comparison.items.map(item => item.target.digest)).size) {
    throw new Error("Insufficient distinct auditory targets for the registered participant quota.");
  }
  for (let index = 0; index < registration.participant_slots.length; index++) {
    const participant = registration.participant_slots[index], selected = matchTargets(slotsFor(comparison, index, uses));
    for (const item of selected) uses.set(item.id, (uses.get(item.id) ?? 0) + 1);
    for (let offset = 0; offset < selected.length; offset += registration.session_length) {
      const ordinal = offset / registration.session_length;
      sessions.push({ id: digest([comparison.digest, participant, ordinal]), participant_slot: participant, ordinal,
        item_ids: selected.slice(offset, offset + registration.session_length).map(item => item.id) });
    }
  }
  const content = { comparison_digest: comparison.digest, sessions };
  return { ...content, digest: digest(content) };
}

export function validateAuditoryPlan(comparison: AuditoryComparison, plan: ComparisonPlan): void {
  if (digest(plan) !== digest(allocateAuditory(comparison))) throw new Error("Auditory allocation changed.");
}

export function auditoryPacket(comparison: AuditoryComparison, release: AuditoryRelease, plan: ComparisonPlan, sessionId: string): AuditoryPacket {
  validateRelease(comparison, release);
  validateAuditoryPlan(comparison, plan);
  const session = plan.sessions.find(value => value.id === sessionId);
  if (!session) throw new Error("Unknown auditory session.");
  const items = new Map(comparison.items.map(item => [item.id, item])), assets = new Map(release.assets.map(asset => [asset.target_digest, asset]));
  return { session_id: sessionId, rubric: structuredClone(AUDITORY_RUBRIC), items: session.item_ids.map((id, position) => ({
    position, item_id: id, audio_sha256: assets.get(items.get(id)!.target.digest)!.audio.sha256, mime_type: "audio/wav",
  })) };
}
