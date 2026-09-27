import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { englishSharedSpellings } from "../elements/graphemes/shared.js";
import { createSpellingRuleSlots } from "./spelling-construction-slots.js";

const rules = englishConfig.spellingRules!;
const migrated = ["ks-to-x", "gz-to-x", "cw-to-qu", "cx-to-x"];

describe("shared spelling named slots (pure scheduling fixtures)", () => {
  it.each(["syllable", "word"] as const)("retains exact legacy %s order when absent", phase => {
    expect(createSpellingRuleSlots(rules).slots(phase)).toEqual(rules.flatMap((rule, index) =>
      !rule.scope || rule.scope === "both" || rule.scope === phase ? [{ kind: "regex", index, rule }] : []));
  });
  it.each(["syllable", "word"] as const)("replaces only the registered %s slots", phase => {
    const actual = createSpellingRuleSlots(rules, englishSharedSpellings).slots(phase);
    const legacy = createSpellingRuleSlots(rules).slots(phase);
    expect(actual).toEqual(legacy.filter(slot => rules[slot.index].name !== "cx-to-x").map(slot =>
      migrated.includes(rules[slot.index].name)
        ? { kind: "shared", index: slot.index, ruleId: rules[slot.index].name } : slot));
  });
  it("disables all migrated regexes for an explicitly empty policy", () => {
    const actual = createSpellingRuleSlots(rules, []).slots("word");
    expect(actual).toEqual(createSpellingRuleSlots(rules).slots("word")
      .filter(slot => !migrated.includes(rules[slot.index].name)));
  });
  it("binds a custom rule to its named position and narrows its phase without a regex fallback", () => {
    const custom = { ...englishSharedSpellings[0], id: "custom", scope: "word" as const };
    const predecessors = [{ name: "before", pattern: "a", replacement: "b" },
      { name: "custom", pattern: "ks", replacement: "x" },
      { name: "after", pattern: "c", replacement: "d" }];
    const schedule = createSpellingRuleSlots(predecessors, [custom]);
    expect(schedule.slots("word")[1]).toEqual({ kind: "shared", index: 1, ruleId: "custom" });
    expect(schedule.slots("syllable").map(slot => slot.index)).toEqual([0, 2]);
  });
  it("rejects missing and ambiguous custom slots", () => {
    expect(() => createSpellingRuleSlots([], englishSharedSpellings)).toThrow("unique predecessor");
    expect(() => createSpellingRuleSlots([...rules, rules.find(rule => rule.name === "ks-to-x")!],
      englishSharedSpellings)).toThrow("unique predecessor");
  });
  it("rejects scope expansion and use of the retired cleanup slot", () => {
    expect(() => createSpellingRuleSlots(rules, [{ ...englishSharedSpellings[1], scope: "both" }]))
      .toThrow("scope exceeds");
    expect(() => createSpellingRuleSlots(rules, [{ ...englishSharedSpellings[1], id: "cx-to-x" }]))
      .toThrow("unique predecessor");
  });
  it("validates policy before scheduling", () => {
    expect(() => createSpellingRuleSlots(rules, [{ ...englishSharedSpellings[0], probability: -1 }]))
      .toThrow("Invalid or duplicate");
  });
  it("isolates source and returned schedule mutations", () => {
    const predecessors = rules.map(rule => ({ ...rule }));
    const shared = englishSharedSpellings.map(rule => ({ ...rule }));
    const schedule = createSpellingRuleSlots(predecessors, shared);
    const expected = schedule.slots("word");
    predecessors[0].name = "mutated";
    shared[0].scope = "syllable";
    const returned = schedule.slots("word");
    const regex = returned.find(slot => slot.kind === "regex")!;
    if (regex.kind === "regex") regex.rule.name = "mutated return";
    returned.reverse();
    expect(schedule.slots("word")).toEqual(expected);
  });
});
