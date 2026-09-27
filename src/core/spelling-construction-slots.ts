import type { SharedSpellingRule, SpellingRule } from "../config/language.js";
import { createSharedSpellingPolicy } from "./spelling-construction-policy.js";

export type SpellingPass = "syllable" | "word";
export type SpellingRuleSlot =
  | { kind: "regex"; index: number; rule: SpellingRule }
  | { kind: "shared"; index: number; ruleId: string };

const migratedRules = new Set(["ks-to-x", "gz-to-x", "cw-to-qu", "cx-to-x"]);

function applies(scope: SpellingRule["scope"], phase: SpellingPass): boolean {
  return scope === undefined || scope === "both" || scope === phase;
}

/** Bind shared IDs to unique predecessor slots; never invent an execution position. */
export function createSpellingRuleSlots(
  spellingRules: readonly SpellingRule[], sharedRules?: readonly SharedSpellingRule[],
) {
  const predecessors = spellingRules.map(rule => ({ ...rule }));
  const shared = new Map<string, SharedSpellingRule["scope"]>();
  if (sharedRules !== undefined) {
    createSharedSpellingPolicy(sharedRules);
    for (const rule of sharedRules) {
      const matches = predecessors.filter(predecessor => predecessor.name === rule.id);
      if (rule.id === "cx-to-x" || matches.length !== 1) {
        throw new Error(`Shared spelling requires one unique predecessor slot: ${rule.id}`);
      }
      for (const phase of ["syllable", "word"] as const) {
        if (applies(rule.scope, phase) && !applies(matches[0].scope, phase)) {
          throw new Error(`Shared spelling scope exceeds predecessor slot: ${rule.id}`);
        }
      }
      shared.set(rule.id, rule.scope);
    }
  }

  function slots(phase: SpellingPass): SpellingRuleSlot[] {
    const result: SpellingRuleSlot[] = [];
    predecessors.forEach((rule, index) => {
      const scope = shared.get(rule.name);
      if (scope !== undefined) {
        if (applies(scope, phase)) result.push({ kind: "shared", index, ruleId: rule.name });
      } else if ((sharedRules === undefined || !migratedRules.has(rule.name)) && applies(rule.scope, phase)) {
        result.push({ kind: "regex", index, rule: { ...rule } });
      }
    });
    return result;
  }

  return { slots };
}
