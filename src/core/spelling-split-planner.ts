import type { LanguageConfig, SharedSpellingRule } from "../config/language.js";
import type { RNG } from "../utils/random.js";
import type { ConstructionLedgerView } from "./spelling-construction-ownership.js";
import { createSplitSpanResolver } from "./spelling-split-ownership.js";
import { createSplitNeighborGuard } from "./spelling-split-neighbors.js";
import { createSplitVowelPolicy } from "./spelling-split-policy.js";
import type { SplitVowelContext, SplitVowelRoutes, SplitVowelSupport } from "./spelling-split-policy.js";

/** A formed decision is a proposal; it still requires an authenticated atomic ledger commit. */
export function createSplitConstructionPlanner(config: Pick<LanguageConfig, "graphemes" | "doubling">,
  supports: readonly SplitVowelSupport[], routes: SplitVowelRoutes, sharedRules: readonly SharedSpellingRule[]) {
  const resolve = createSplitSpanResolver(sharedRules);
  const policy = createSplitVowelPolicy(supports, routes);
  const checkNeighbors = createSplitNeighborGuard(config, sharedRules);
  function decide(view: ConstructionLedgerView, nucleusId: number, route: SplitVowelContext["route"], rand: RNG) {
    const cursor = { ...view.cursor };
    const span = resolve(view, nucleusId, route);
    if (span.status === "refused") return { status: "ownership-refused" as const, cursor, nucleusId, route, reason: span.reason };
    const support = policy.describe(span.context);
    if (support.status === "refused") return { status: "policy-refused" as const, cursor, nucleusId, route, span, reason: support.reason };
    const neighbors = checkNeighbors(view, span, support.support);
    if (neighbors.status === "refused") return { status: "neighbor-refused" as const, cursor, nucleusId, route, span, neighbors };
    return { status: "evaluated" as const, cursor, nucleusId, route, span, neighbors, trial: policy.sample(span.context, rand) };
  }
  function verify(view: ConstructionLedgerView, nucleusId: number, route: SplitVowelContext["route"], attempt: ReturnType<typeof decide>): void {
    const expected = decide(view, nucleusId, route, () => {
      const trial = attempt.status === "evaluated" ? attempt.trial : undefined;
      if (!trial || trial.status === "refused" || trial.roll === undefined) throw new Error("Missing split-vowel draw");
      return trial.roll;
    });
    if (JSON.stringify(expected) !== JSON.stringify(attempt)) throw new Error("Invalid split-vowel attempt");
  }
  return { decide, verify };
}
