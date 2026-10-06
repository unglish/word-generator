import { allocateComparison } from "../comparison/comparison-allocation.js";
import type { ComparisonPlan } from "../comparison/comparison-model.js";
import { digest } from "../snapshot.js";
import { validateReadAloud } from "./freeze.js";
import type { ReadAloudComparison, ReadAloudPacket } from "./model.js";

export function allocateReadAloud(comparison: ReadAloudComparison): ComparisonPlan {
  validateReadAloud(comparison);
  const partitionPlan = allocateComparison(comparison.partition);
  const sessions = partitionPlan.sessions.map(session => ({ ...session,
    id: digest([comparison.digest, session.participant_slot, session.ordinal]) }));
  const content = { comparison_digest: comparison.digest, sessions };
  return { ...content, digest: digest(content) };
}

export function validateReadAloudPlan(comparison: ReadAloudComparison, plan: ComparisonPlan): void {
  if (digest(plan) !== digest(allocateReadAloud(comparison))) throw new Error("Read-aloud spelling allocation changed.");
}

export function readAloudPacket(comparison: ReadAloudComparison, plan: ComparisonPlan, sessionId: string): ReadAloudPacket {
  validateReadAloudPlan(comparison, plan);
  const session = plan.sessions.find(value => value.id === sessionId);
  if (!session) throw new Error("Unknown read-aloud session.");
  const items = new Map(comparison.partition.items.map(item => [item.id, item]));
  return { session_id: session.id, instructions: comparison.registration.recording.instructions,
    items: session.item_ids.map((id, position) => ({ position, item_id: id, spelling: items.get(id)!.spelling })) };
}
