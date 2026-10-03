import { digest } from "../snapshot.js";
import { parseAssignment, RUBRIC } from "../protocol.js";
import { CONDITIONS, validateComparison } from "./comparison-freeze.js";
import type { ComparisonItem, ComparisonPlan, Condition, PlannedSession, ReviewerPacket, WrittenComparison } from "./comparison-model.js";

interface Slot { condition: Condition; stratum: string; candidates: ComparisonItem[] }
function compareKeys(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }

function slotsFor(comparison: WrittenComparison, participantIndex: number, uses: Map<string, number>): Slot[] {
  const registration = comparison.registration, slots: Slot[] = [];
  const participant = registration.participant_slots[participantIndex];
  for (let stratumIndex = 0; stratumIndex < registration.strata.length; stratumIndex++) {
    const stratum = registration.strata[stratumIndex].id;
    for (let pair = 0; pair < registration.pairs_per_stratum; pair++) {
      const order = (participantIndex + stratumIndex + pair) % 2 ? [...CONDITIONS].reverse() : CONDITIONS;
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

// Augmenting paths can move earlier choices. Greedy selection can incorrectly
// exhaust a condition when the same spelling belongs to several condition pools.
function matchSpellings(slots: Slot[]): ComparisonItem[] {
  const assigned = new Map<string, number>(), choices = new Map<number, ComparisonItem>();
  function assign(index: number, visited: Set<string>): boolean {
    for (const item of slots[index].candidates) {
      if (visited.has(item.spelling)) continue;
      visited.add(item.spelling);
      const previous = assigned.get(item.spelling);
      if (previous === undefined || assign(previous, visited)) {
        assigned.set(item.spelling, index); choices.set(index, item); return true;
      }
    }
    return false;
  }
  for (let index = 0; index < slots.length; index++) {
    if (!assign(index, new Set())) throw new Error(`Insufficient distinct spellings for balanced allocation at ${slots[index].condition}/${slots[index].stratum}; no fallback allocation.`);
  }
  return slots.map((_, index) => choices.get(index)!);
}
export function allocateComparison(comparison: WrittenComparison): ComparisonPlan {
  validateComparison(comparison);
  const sessions: PlannedSession[] = [], uses = new Map<string, number>();
  const registration = comparison.registration;
  const slotsPerParticipant = 2 * registration.strata.length * registration.pairs_per_stratum;
  if (!Number.isSafeInteger(slotsPerParticipant) || slotsPerParticipant > new Set(comparison.items.map(item => item.spelling)).size) {
    throw new Error("Insufficient distinct spellings for the registered participant quota.");
  }
  for (let index = 0; index < registration.participant_slots.length; index++) {
    const participant = registration.participant_slots[index];
    const selected = matchSpellings(slotsFor(comparison, index, uses));
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
export function validatePlan(comparison: WrittenComparison, plan: ComparisonPlan): void {
  if (digest(plan) !== digest(allocateComparison(comparison))) throw new Error("Comparison allocation changed.");
}
export function reviewerPacket(comparison: WrittenComparison, plan: ComparisonPlan, sessionId: string): ReviewerPacket {
  validatePlan(comparison, plan);
  const session = plan.sessions.find(value => value.id === sessionId);
  if (!session) throw new Error("Unknown comparison session.");
  const items = new Map(comparison.items.map(item => [item.id, item]));
  const assignment = parseAssignment({ rubric: structuredClone(RUBRIC), items: session.item_ids.map((id, position) => ({
    position, sample_id: id, spelling: items.get(id)!.spelling,
  })) });
  return { session_id: sessionId, assignment };
}
