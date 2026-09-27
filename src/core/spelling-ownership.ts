import type { SpellingCell, SpellingCellOrigin } from "./base-spelling.js";

/** Only these origins carry a single original-unit owner. */
export function isSingleOwned(origin: SpellingCellOrigin): origin is Exclude<SpellingCellOrigin, { kind: "rewrite" | "shared" | "split-vowel" }> {
  return origin.kind === "completion" || origin.kind === "selection" || origin.kind === "licensed" || origin.kind === "normalized";
}

export function sourceUnits(origin: SpellingCellOrigin): readonly number[] {
  return isSingleOwned(origin) || origin.kind === "split-vowel" ? [origin.unitId] : origin.sourceUnitIds;
}

/** The display part of an edit follows its complete consumed extent. */
export function editPart(input: readonly SpellingCell[], insertionPart?: number): number | null {
  const parts = new Set(input.map(cell => cell.partId));
  if (parts.size === 1 && !parts.has(null) && !parts.has(undefined)) return input[0].partId!;
  return input.length === 0 ? insertionPart ?? null : null;
}
