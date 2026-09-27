import type { LanguageConfig } from "../config/language.js";
import type { GraphemeReading } from "../types.js";
import { createGraphemeResolver, NoLegalGraphemeError } from "./grapheme-selection.js";
import type { GraphemePrefixState, GraphemeSlot } from "./grapheme-selection.js";

export interface CompletionProposal {
  inventoryIndex: number;
  form: string;
  weight: number;
  reading?: GraphemeReading;
  refusal?: "unknown-reading" | "unsupported-reading" | "unresolved-vowel-obligation";
}

function readingRefusal(reading: GraphemeReading | undefined): CompletionProposal["refusal"] {
  if (!reading) return "unknown-reading";
  if (reading.kind === "unsupported-construction") return "unsupported-reading";
  if (reading.kind === "open-vowel-or-split-marker") return "unresolved-vowel-obligation";
  return;
}

/** Caller supplies authenticated current prefix; eligible readings still require projected-neighbor checks. */
export function createCompletionCandidatePool(configuration: LanguageConfig) {
  const config = structuredClone(configuration);
  const resolve = createGraphemeResolver(config);
  const inventory = new Map(config.graphemes.map((grapheme, index) => [grapheme, index]));
  return (slot: GraphemeSlot, prefix: GraphemePrefixState) => {
    if (slot.position !== "nucleus" || !Number.isSafeInteger(prefix.doublingCount) || prefix.doublingCount < 0) {
      throw new Error("Invalid completion resolver context");
    }
    try {
      const pool = resolve(slot, prefix);
      const proposals: CompletionProposal[] = pool.weights.map(([grapheme, weight]) => {
        const inventoryIndex = inventory.get(grapheme);
        if (inventoryIndex === undefined) throw new Error("Completion candidate missing inventory identity");
        const reading = grapheme.reading;
        const refusal = readingRefusal(reading);
        return { inventoryIndex, form: grapheme.form, weight, ...(reading ? { reading: structuredClone(reading) } : {}), ...(refusal ? { refusal } : {}) };
      });
      return { status: "available" as const, pool: pool.fallback ? "fallback" as const : "ordinary" as const,
        ...(pool.fallback ? { fallbackReason: pool.fallback } : {}), quotaRelaxed: !!pool.preferenceRelaxed, proposals };
    } catch (error) {
      if (error instanceof NoLegalGraphemeError) return { status: "unavailable" as const, reason: "no-legal-grapheme" as const };
      throw error;
    }
  };
}
