import type { LanguageConfig } from "../../config/language.js";
import type { WordGenerationContext } from "../../types.js";
import type { MorphologyResult } from "./realization.js";
import { measureSpellingBudgets } from "../spelling-budget.js";
import { repairConsonantLetters } from "../write.js";

/** Final spelling cleanup shared by generation and operation replay. */
export function finalizeMorphologySpelling(
  config: Pick<LanguageConfig, "writtenFormConstraints">, context: WordGenerationContext, morphology: MorphologyResult,
): void {
  // Post-morphology consonant letter repair: suffix attachment can create
  // consonant runs that exceed the limit (e.g. "marks" + "tion" = "markstion").
  const maxCons = config.writtenFormConstraints?.maxConsonantLetters;
  const preservePhones = config.writtenFormConstraints?.policy === "preserve-phones";
  const finalBudget = preservePhones ? measureSpellingBudgets(context.word.written.clean, config.writtenFormConstraints) : undefined;
  if (finalBudget) context.trace?.recordSpellingBudget({
    version: 1, scope: "final-morphology", before: finalBudget, after: finalBudget,
    visitedAssignments: 0, legalOptions: 0, unresolvedCells: context.word.written.clean.length,
    changedUnits: [], ...(finalBudget.exceeded.length
      ? { status: "infeasible", reason: "unresolved-ownership", refusals: { "unresolved-ownership": 1 } }
      : { status: "satisfied" }),
  });
  if (maxCons) {
    const activeParts = morphology.parts.filter(part => part.text);
    const cleanParts = activeParts.map(part => part.text);
    // repairConsonantLetters expects part strings at even indices, matching write.ts.
    const hyphParts: string[] = [];
    for (let i = 0; i < cleanParts.length; i++) {
      hyphParts.push(cleanParts[i]);
      if (i < cleanParts.length - 1) hyphParts.push("");
    }
    if (!finalBudget?.exceeded.length) repairConsonantLetters(cleanParts, hyphParts, maxCons,
      morphology.spelling ? (part, start, count, insert, rule) => {
        morphology.spelling!.replace(activeParts[part].role, start,
          cleanParts[part].slice(start, start + count), insert, rule);
        return true;
      } : undefined);
    for (let i = 0; i < activeParts.length; i++) activeParts[i].text = cleanParts[i];
    context.word.written.clean = cleanParts.join("");
    context.word.written.hyphenated = hyphParts.join("");
  }
  const realization = context.trace?.morphologyTrace?.realization;
  if (realization) {
    realization.emittedParts = morphology.parts.map(part => ({ ...part }));
    if (morphology.spelling) realization.finalSpelling = morphology.spelling.snapshot();
  }
}
