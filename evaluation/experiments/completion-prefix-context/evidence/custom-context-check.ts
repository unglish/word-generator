import assert from "node:assert/strict";
import { englishConfig } from "/private/tmp/q14a-completion-prefix-context-v1/src/config/english.ts";
import { buildGraphemeMaps } from "/private/tmp/q14a-completion-prefix-context-v1/src/elements/graphemes/index.ts";
import type { Grapheme } from "/private/tmp/q14a-completion-prefix-context-v1/src/types.ts";
import { BaseSpelling } from "/private/tmp/q14a-completion-prefix-context-v1/src/core/base-spelling.ts";
import { createCompletionPlanner } from "/private/tmp/q14a-completion-prefix-context-v1/src/core/spelling-completion-planner.ts";
function fixture(alternatives: Grapheme[] = []) {
  const graphemes: Grapheme[] = [
    { phoneme: "k", form: "c", frequency: 1, origin: 0, reading: { kind: "following-letter", forbid: ["e", "i", "y"] } },
    { phoneme: "eɪ", form: "a", frequency: 1, origin: 0, reading: { kind: "open-vowel-or-split-marker" } },
    { phoneme: "t", form: "t", frequency: 1, origin: 0, reading: { kind: "single-phone" } }, ...alternatives,
  ];
  const base = new BaseSpelling(graphemes.slice(0, 3).map((entry, id) => ({ id, part: "root", syllableIndex: 0,
    segment: id === 0 ? "onset" : id === 1 ? "nucleus" : "coda", segmentIndex: 0, soundAtSpelling: entry.phoneme,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === entry.phoneme)!) } })), true, true, true);
  graphemes.slice(0, 3).forEach((entry, id) => base.appendChoice(id, entry.form, entry.form, id, 0));
  const config = { ...englishConfig, graphemes, ...buildGraphemeMaps(graphemes), doubling: undefined, sharedSpellings: [] };
  return { base, planner: createCompletionPlanner(config, []) };
}

const alternatives: Grapheme[] = [
 {phoneme:"eɪ",form:"ai",frequency:1,origin:0,reading:{kind:"single-phone"},condition:{leftGraphemeContext:["c"]}},
 {phoneme:"eɪ",form:"ay",frequency:1,origin:0,reading:{kind:"single-phone"},condition:{notLeftGraphemeContext:["c"]}},
];
const {base,planner}=fixture(alternatives);base.edit(0,1,"cc","opaque-prefix",0);
const view=base.constructionState();const before=structuredClone(view);
const result=planner.decide(view,1,[],()=>{throw Error("Unexpected random draw");});
assert.equal(result.status,"evaluated");
if(result.status!=="evaluated")throw Error("Missing evaluated completion");
assert.equal(result.prefix.prefix.previousForm,"c");
assert.equal(result.sample.status,"selected");
if(result.sample.status!=="selected")throw Error("Missing selection");
assert.equal(result.sample.inventoryIndex,3);assert.deepEqual(view,before);planner.verify(view,1,[],result);
console.log("Custom positive/negative left-written-context conditions use actual boundary; deterministic selection, immutable input and replay pass.");
