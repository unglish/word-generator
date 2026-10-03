import type { createGraphemeResolver } from "./grapheme-selection.js";
import type { compileLexicalStyle } from "./lexical-style.js";
import type { StyleChoice, StyleWeightEvidence } from "./lexical-style-model.js";

type Resolver = ReturnType<typeof createGraphemeResolver>;
type StyledResult = ReturnType<Resolver> & { styleWeights?: StyleWeightEvidence[] };

/** One word's law, reused by ordinary/conditioned selection and repair planning. */
export function createStyledGraphemeResolver(resolve: Resolver,
  runtime: ReturnType<typeof compileLexicalStyle>, choice: StyleChoice | undefined):
  (...args: Parameters<Resolver>) => StyledResult {
  if (!runtime || !choice) return resolve;
  return (...args) => {
    const result = resolve(...args);
    const styled = runtime.apply(result.weights, choice);
    return { ...result, weights: styled.weights, styleWeights: styled.evidence };
  };
}
