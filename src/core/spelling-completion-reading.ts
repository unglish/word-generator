import type { CompletionCertificate, CompletionReplacement } from "./spelling-completion-transaction.js";

/** Resolve exactly one certified replacement; duplicate or ambiguous unit ownership is invalid. */
export function completionReplacementForUnit(
  certificate: CompletionCertificate | undefined,
  unitId: number,
): CompletionReplacement | undefined {
  if (!certificate) return;
  const replacements = [certificate, ...(certificate.neighborReplacements ?? [])]
    .filter(replacement => replacement.unitId === unitId);
  return replacements.length === 1 ? replacements[0] : undefined;
}

/** Readings belong to individual certified units, not the encompassing edit. */
export function completionReadingForUnit(certificate: CompletionCertificate | undefined, unitId: number) {
  return completionReplacementForUnit(certificate, unitId)?.reading;
}
