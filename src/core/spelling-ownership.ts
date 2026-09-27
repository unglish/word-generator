import type { SpellingCellOrigin } from "./base-spelling.js";

/** Only these origins carry a single original-unit owner. */
export function isSingleOwned(origin: SpellingCellOrigin): origin is Exclude<SpellingCellOrigin, { kind: "rewrite" | "shared" }> {
  return origin.kind === "selection" || origin.kind === "licensed" || origin.kind === "normalized";
}

export function sourceUnits(origin: SpellingCellOrigin): readonly number[] {
  return isSingleOwned(origin) ? [origin.unitId] : origin.sourceUnitIds;
}
