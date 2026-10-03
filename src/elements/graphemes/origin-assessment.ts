import type { Grapheme } from "../../types.js";
import type { BorrowingPathway, OriginAssessment, StyleSource } from "../../core/lexical-style-model.js";
import { assessLegacyOrigin } from "../../core/lexical-style.js";

export const englishOriginSources: readonly StyleSource[] = [
  { id: "ahd-thumb", title: "American Heritage: thumb", url: "https://ahdictionary.com/word/search.html?q=thumb", accessed_at: "2026-10-03", claim_scope: "lexeme-history" },
  { id: "ahd-plumb", title: "American Heritage: plumb", url: "https://ahdictionary.com/word/search.html?q=plumb", accessed_at: "2026-10-03", claim_scope: "lexeme-history" },
  { id: "ahd-philosophy", title: "American Heritage: philosophy", url: "https://ahdictionary.com/word/search.html?q=philosophy", accessed_at: "2026-10-03", claim_scope: "lexeme-history" },
  { id: "ahd-nephew", title: "American Heritage: nephew", url: "https://ahdictionary.com/word/search.html?q=nephew", accessed_at: "2026-10-03", claim_scope: "lexeme-history" },
  { id: "ahd-mnemonic", title: "American Heritage: mnemonic", url: "https://ahdictionary.com/word/search.html?q=mnemonic", accessed_at: "2026-10-03", claim_scope: "lexeme-history" },
  { id: "ahd-psalm", title: "American Heritage: psalm", url: "https://ahdictionary.com/word/search.html?q=psalm", accessed_at: "2026-10-03", claim_scope: "lexeme-history" },
];
const pathways = new Map<string, BorrowingPathway[]>([
  [JSON.stringify(["m", "mb"]), [
    { example: "thumb", language_stages: ["Old English", "Middle English"], source_id: "ahd-thumb" },
    { example: "plumb", language_stages: ["Latin", "Old French", "Middle English"], source_id: "ahd-plumb" },
  ]],
  [JSON.stringify(["f", "ph"]), [
    { example: "philosophy", language_stages: ["Greek", "Latin", "Old French", "Middle English"], source_id: "ahd-philosophy" },
    { example: "nephew", language_stages: ["Latin", "Old French", "Middle English"], source_id: "ahd-nephew" },
  ]],
  [JSON.stringify(["n", "mn"]), [
    { example: "mnemonic", language_stages: ["Greek"], source_id: "ahd-mnemonic" },
  ]],
  [JSON.stringify(["s", "ps"]), [
    { example: "psalm", language_stages: ["Greek", "Latin", "Old English", "Middle English"], source_id: "ahd-psalm" },
  ]],
]);

export function englishOriginAssessment(grapheme: Grapheme, labels: readonly string[]): OriginAssessment {
  const examples = pathways.get(JSON.stringify([grapheme.phoneme, grapheme.form]));
  return { kind: examples ? "lexeme-dependent" : "unassessed", legacy: assessLegacyOrigin(grapheme.origin, labels),
    pathways: examples ? structuredClone(examples) : [],
    interpretation: examples
      ? "Documented example-word histories; they do not establish the origin of this spelling or a generated root."
      : "No lexical history assessed for this correspondence; the legacy code is unsourced." };
}

export function withEnglishOriginAssessments(items: Grapheme[], labels: readonly string[]): Grapheme[] {
  return items.map(grapheme => ({ ...grapheme, originAssessment: englishOriginAssessment(grapheme, labels) }));
}
