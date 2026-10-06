import type { LanguageConfig } from "../config/language.js";
import type { RNG } from "../utils/random.js";
import type { ConstructionLedgerView } from "./spelling-construction-ownership.js";
import type { SplitVowelSupport } from "./spelling-split-policy.js";
import type { SplitVowelConstruction } from "./spelling-split-transaction.js";
import { spellingBoundaryContexts } from "./spelling-context.js";
import { createCompletionObligationInspector } from "./spelling-completion-obligation.js";
import { createCompletionPrefixResolver, createCompletionNeighborPrefixResolver } from "./spelling-completion-prefix.js";
import { createCompletionCandidatePool, createCompletionNeighborCandidatePool } from "./spelling-completion-pool.js";
import { createCompletionProjectionGuard } from "./spelling-completion-projection.js";
import { sampleCompletion } from "./spelling-completion-sampling.js";

/** Decisions authenticate conditional proposals; applying one still requires an atomic ledger transition. */
export function createCompletionPlanner(configuration: LanguageConfig, supports: readonly SplitVowelSupport[]) {
  const config = structuredClone(configuration);
  const inspect = createCompletionObligationInspector(config, supports);
  const resolvePrefix = createCompletionPrefixResolver(config);
  const resolvePool = createCompletionCandidatePool(config);
  const resolveNeighborPrefix = createCompletionNeighborPrefixResolver(config);
  const resolveNeighborPool = createCompletionNeighborCandidatePool(config);
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
    if (sample.status === "selected") return { ...context, status: "evaluated" as const, prefix, pool, proposals, sample };
    const contexts = spellingBoundaryContexts(view.phones);
    const jointProposals = proposals.flatMap(proposal => {
      if (!("projection" in proposal) || proposal.projection.status !== "refused" ||
          proposal.projection.reason !== "neighbor-reading" || proposal.projection.unitId === undefined) return [];
      const unitId = proposal.projection.unitId;
      const neighborPrefix = resolveNeighborPrefix(view, unitId);
      if (neighborPrefix.status !== "available") return [];
      const jointNeighborPrefix = unitId > nucleusId ? { ...neighborPrefix.prefix, previousForm: proposal.form } : neighborPrefix.prefix;
      const neighborPool = resolveNeighborPool(contexts[unitId].slot, jointNeighborPrefix);
      if (neighborPool.status !== "available") return [];
      return neighborPool.proposals.map(neighbor => {
        const jointNucleusPrefix = unitId < nucleusId ? { ...prefix.prefix, previousForm: neighbor.form } : prefix.prefix;
        const nucleusPool = resolvePool(contexts[nucleusId].slot, jointNucleusPrefix);
        const nucleusCandidate = nucleusPool.status === "available" ? nucleusPool.proposals.find(entry => entry.inventoryIndex === proposal.inventoryIndex) : undefined;
        const projection = project(view, nucleusId, proposal.inventoryIndex, splits, { unitId, inventoryIndex: neighbor.inventoryIndex });
        let refusal: string | undefined = neighbor.refusal;
        if (!refusal && !nucleusCandidate) refusal = "joint-nucleus-ineligible";
        if (!refusal && nucleusCandidate?.refusal) refusal = nucleusCandidate.refusal;
        if (!refusal && projection.status === "refused") refusal = projection.reason;
        return { nucleus: proposal, neighbor: { ...neighbor, unitId }, neighborPrefix, neighborPool, jointNeighborPrefix, jointNucleusPrefix, nucleusPool, projection,
          weight: (nucleusCandidate?.weight ?? proposal.weight) * neighbor.weight,
          ...(refusal ? { refusal } : {}) };
      });
    }).map((proposal, inventoryIndex) => ({ ...proposal, inventoryIndex }));
    if (!jointProposals.length) return { ...context, status: "evaluated" as const, prefix, pool, proposals, sample };
    const joint = { proposals: jointProposals, sample: sampleCompletion(jointProposals, rand) };
    return { ...context, status: "evaluated" as const, prefix, pool, proposals, sample, joint };
  }
  function verify(view: ConstructionLedgerView, nucleusId: number, splits: readonly SplitVowelConstruction[], attempt: ReturnType<typeof decide>): void {
    const expected = decide(view, nucleusId, splits, () => {
      if (attempt.status !== "evaluated") throw new Error("Missing completion draw");
      const sample = "joint" in attempt ? attempt.joint.sample : attempt.sample;
      if (sample.status !== "selected" || sample.roll === undefined) throw new Error("Missing completion draw");
      return sample.roll;
    });
    if (JSON.stringify(expected) !== JSON.stringify(attempt)) throw new Error("Invalid completion attempt");
  }
  return { decide, verify };
}
