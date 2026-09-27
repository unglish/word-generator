import type { LanguageConfig } from "../config/language.js";
import type { ConstructionLedgerView } from "./spelling-construction-ownership.js";
import { resolveSingleSpellingUnit } from "./spelling-construction-ownership.js";
import { createSharedSurfaceGuard } from "./spelling-construction-edit.js";
import { createDoublingModel } from "./spelling-doubling.js";
import { spellingBoundaryContexts } from "./spelling-context.js";

/** Prior certificates must already be authenticated; spelling repairs do not invent new doubling draws. */
export function createCompletionPrefixResolver(configuration: LanguageConfig) {
  const config = structuredClone(configuration);
  const doubling = createDoublingModel(config.doubling);
  const sharedGuard = createSharedSurfaceGuard(config.sharedSpellings ?? []);
  return (view: ConstructionLedgerView, nucleusId: number) => {
    const unavailable = (reason: string) => ({ status: "unavailable" as const, reason });
    const target = resolveSingleSpellingUnit(view, nucleusId);
    if (target.status !== "complete") return unavailable(target.reason);
    const contexts = spellingBoundaryContexts(view.phones);
    if (contexts[nucleusId]?.slot.position !== "nucleus") return unavailable("not-nucleus");
    if (view.units.length !== view.phones.length) return unavailable("incomplete-root");
    const certificate = view.certificates[view.certificates.length - 1];
    let count = 0;
    let nucleus = "";
    let previousNucleus = "";
    for (let id = 0; id < nucleusId; id++) {
      const unit = view.units[id]; const context = contexts[id];
      if (!certificate) {
        if (unit.doublingIncrement !== 0 && unit.doublingIncrement !== 1) return unavailable("missing-doubling-history");
        count += unit.doublingIncrement;
        continue;
      }
      const choice = certificate.choices[id];
      if (!choice || choice.unitId !== id) return unavailable("missing-coverage-choice");
      const decision = doubling.describe({ ...context.doubling, form: choice.selected,
        nucleusForm: context.slot.position === "onset" ? previousNucleus : context.slot.position === "nucleus" ? choice.selected : nucleus }, count);
      if (decision.kind === "fixed") {
        if (decision.form !== choice.afterDoubling) return unavailable("invalid-coverage-doubling");
        count += decision.countIncrement;
      } else if (choice.afterDoubling === decision.form && decision.probability < 100) {
        // A recorded unexpanded alternative consumes no doubling quota.
      } else if (choice.afterDoubling === decision.doubledForm && decision.probability > 0) count++;
      else return unavailable("invalid-coverage-doubling");
      if (context.slot.position === "nucleus") nucleus = choice.selected;
      if (contexts[id + 1]?.slot.syllableIndex !== context.slot.syllableIndex) { previousNucleus = nucleus; nucleus = ""; }
    }
    const evidence = { doublingCount: count, quotaSource: certificate ? "coverage" as const : "original" as const,
      ...(certificate ? { certificateId: certificate.id } : {}) };
    if (nucleusId === 0) return target.start === 0
      ? { status: "available" as const, prefix: { doublingCount: count }, evidence }
      : unavailable("unowned-prefix");
    const previousId = nucleusId - 1;
    const shared = view.constructions.filter(entry => entry.sourceUnitIds.includes(previousId));
    if (shared.length) {
      if (shared.length !== 1 || sharedGuard(view, view, shared).status !== "allowed") return unavailable("invalid-shared-prefix");
      const construction = shared[0];
      if (construction.phoneIds[construction.phoneIds.length - 1] !== previousId ||
          view.cells[target.start - 1]?.id !== construction.outputCellIds[construction.outputCellIds.length - 1]) return unavailable("nonadjacent-prefix");
      return { status: "available" as const, prefix: { previousForm: construction.after, doublingCount: count },
        evidence: { ...evidence, sharedConstructionId: construction.id } };
    }
    const previous = resolveSingleSpellingUnit(view, previousId);
    if (previous.status !== "complete") return unavailable(previous.reason);
    if (previous.end !== target.start) return unavailable("nonadjacent-prefix");
    return { status: "available" as const, prefix: { previousForm: previous.before, doublingCount: count }, evidence };
  };
}
