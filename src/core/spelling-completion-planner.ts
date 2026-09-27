import type { LanguageConfig } from "../config/language.js";
import type { RNG } from "../utils/random.js";
import type { ConstructionLedgerView } from "./spelling-construction-ownership.js";
import type { SplitVowelSupport } from "./spelling-split-policy.js";
import type { SplitVowelConstruction } from "./spelling-split-transaction.js";
import { spellingBoundaryContexts } from "./spelling-context.js";
import { createCompletionObligationInspector } from "./spelling-completion-obligation.js";
import { createCompletionPrefixResolver } from "./spelling-completion-prefix.js";
import { createCompletionCandidatePool } from "./spelling-completion-pool.js";
import { createCompletionProjectionGuard } from "./spelling-completion-projection.js";
import { sampleCompletion } from "./spelling-completion-sampling.js";

/** Decisions authenticate conditional proposals; applying one still requires an atomic ledger transition. */
export function createCompletionPlanner(configuration: LanguageConfig, supports: readonly SplitVowelSupport[]) {
  const config = structuredClone(configuration);
  const inspect = createCompletionObligationInspector(config, supports);
  const resolvePrefix = createCompletionPrefixResolver(config);
  const resolvePool = createCompletionCandidatePool(config);
  const project = createCompletionProjectionGuard(config, supports);
  function decide(view: ConstructionLedgerView, nucleusId: number, splits: readonly SplitVowelConstruction[], rand: RNG) {
    const cursor = { ...view.cursor };
    const obligation = inspect(view, nucleusId, splits);
    const context = { cursor, nucleusId, obligation };
    if (obligation.status !== "unresolved") return { ...context, status: "unchanged" as const };
    const prefix = resolvePrefix(view, nucleusId);
    if (prefix.status === "unavailable") return { ...context, status: "prefix-unavailable" as const, prefix };
    const pool = resolvePool(spellingBoundaryContexts(view.phones)[nucleusId].slot, prefix.prefix);
    if (pool.status === "unavailable") return { ...context, status: "pool-unavailable" as const, prefix, pool };
    const proposals = pool.proposals.map(proposal => {
      if (proposal.refusal) return { ...proposal };
      const projection = project(view, nucleusId, proposal.inventoryIndex, splits);
      return { ...proposal, projection, ...(projection.status === "refused" ? { refusal: projection.reason } : {}) };
    });
    const sample = sampleCompletion(proposals, rand);
    return { ...context, status: "evaluated" as const, prefix, pool, proposals, sample };
  }
  function verify(view: ConstructionLedgerView, nucleusId: number, splits: readonly SplitVowelConstruction[], attempt: ReturnType<typeof decide>): void {
    const expected = decide(view, nucleusId, splits, () => {
      if (attempt.status !== "evaluated" || attempt.sample.status !== "selected" || attempt.sample.roll === undefined) {
        throw new Error("Missing completion draw");
      }
      return attempt.sample.roll;
    });
    if (JSON.stringify(expected) !== JSON.stringify(attempt)) throw new Error("Invalid completion attempt");
  }
  return { decide, verify };
}
