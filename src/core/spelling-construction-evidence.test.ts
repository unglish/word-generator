import { describe, expect, it } from "vitest";
import { englishConfig } from "../index.js";
import type { Grapheme } from "../types.js";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import { englishSharedSpellings } from "../elements/graphemes/shared.js";
import { BaseSpelling } from "./base-spelling.js";
import type { BaseSpellingTraceV4 } from "./base-spelling.js";
import { spellingBoundaryContexts } from "./spelling-context.js";
import { createSharedConstructionPlanner } from "./spelling-construction.js";
import { createSharedLedgerReplayer } from "./spelling-construction-evidence.js";
import { createSpellingNormalizer } from "./spelling-normalization.js";
import { createSpellingCoveragePlanner } from "./spelling-coverage.js";
import { isSingleOwned } from "./spelling-ownership.js";

const glyph = (phoneme: string, form: string): Grapheme => ({ phoneme, form, frequency: 1, origin: 0,
  startWord: 1, midWord: 1, endWord: 1, reading: { kind: "single-phone" } });

/** Pure ledger fixtures execute the actual normalization observation schedule. */
function fixture(sounds = ["æ", "k", "s"], forms = ["a", "c", "s"], parts = [0, 0, 0], alternatives: Grapheme[] = [], syllableFormation = false) {
  const graphemes = [...sounds.map((sound, id) => glyph(sound, forms[id])), ...alternatives];
  const config = { ...englishConfig, graphemes, ...buildGraphemeMaps(graphemes), doubling: undefined,
    writtenFormConstraints: { policy: "preserve-phones" as const, maxVowelLetters: 1 } };
  const counts = new Map<string, number>();
  const phones = sounds.map((sound, id) => {
    const phoneme = structuredClone(englishConfig.phonemes.find(phone => phone.sound === sound)!);
    const segment = phoneme.nucleus ? "nucleus" as const : "coda" as const;
    const key = `${parts[id]}/${segment}`;
    const segmentIndex = counts.get(key) ?? 0;
    counts.set(key, segmentIndex + 1);
    return { id, part: "root" as const, syllableIndex: parts[id], segment,
      segmentIndex, soundAtSpelling: sound, boundary: { phoneme } };
  });
  const base = new BaseSpelling(phones, true, true, true, englishSharedSpellings, config);
  const contexts = spellingBoundaryContexts(phones);
  const normalizer = createSpellingNormalizer(config, undefined, undefined, englishSharedSpellings);
  const planner = createSharedConstructionPlanner(englishSharedSpellings, config);
  function shared(ruleId: string, ids: number[], roll = 0, partId?: number) {
    const slot = partId === undefined ? { phase: "word" as const, partId: null } : { phase: "syllable" as const, partId };
    base.setPhase(slot.phase);
    base.recordSharedAttempt(slot, ruleId, ids, planner.decide(base.constructionState(), slot, ruleId, ids, () => roll));
  }
  function check(site: "adjacent-choice" | "syllable-join", end: number) {
    const { cells } = base.current();
    const part = parts[end];
    const previous = site === "adjacent-choice"
      ? cells.filter(cell => parts[end - 1] === part && isSingleOwned(cell.origin) && cell.origin.unitId === end - 1)
      : cells.filter(cell => cell.partId === part - 1);
    const rightIndex = cells.findIndex(cell => site === "adjacent-choice"
      ? cell.origin.kind === "selection" && cell.origin.unitId === end : cell.partId === part);
    const left = previous[previous.length - 1]; const right = cells[rightIndex];
    base.recordNormalizationCheck(site, !!left && !!right);
    if (left && right && left.text === right.text) {
      const view = base.constructionState();
      const input = { ...base.current(), ...base.normalizationState(), contexts,
        states: normalizer.historicalStates(base.current().units, contexts), site, rightIndex,
        shared: { constructions: view.constructions, certificates: view.certificates } };
      base.recordNormalization(site, rightIndex, normalizer.decide(input));
    }
  }
  for (const [id, form] of forms.entries()) {
    base.appendChoice(id, form, form, id, 0);
    check("adjacent-choice", id);
    if (parts[id + 1] === parts[id]) continue;
    base.setPhase("syllable");
    if (syllableFormation && parts[id] === 0) shared("ks-to-x", [1, 2], 0, 0);
    check("syllable-join", id);
  }
  base.setPhase("word");
  const trace = (): BaseSpellingTraceV4 => {
    const result = base.snapshot();
    if (result.version !== 4) throw new Error("Expected v4");
    return result;
  };
  return { base, config, contexts, shared, trace, replay: createSharedLedgerReplayer(config, englishSharedSpellings) };
}

describe("v4 ledger semantic replay", () => {
  it("reconstructs the full shared, generic, batch and gap history", () => {
    const f = fixture();
    f.base.edit(0, 1, "e", "prefix-before-shared");
    // The prefix rewrite is unresolved, so preserve a separate complete fixture for formation.
    expect(f.replay(f.trace())).toMatchObject({ version: 4, sharedWriterSchedule: "unverified" });
    const g = fixture();
    g.shared("ks-to-x", [1, 2], 0.9);
    g.shared("ks-to-x", [1, 2]);
    g.base.edit(1, 1, "", "refused");
    g.base.editBatch([{ start: 0, deleteCount: 1, insert: "e", rule: "prefix" }]);
    g.base.replaceWithGapSpelling("ex", "other", "lexical");
    expect(g.replay(g.trace())).toMatchObject({ verifiedSharedEvents: 5, verifiedCertificates: 0, verifiedEpisodes: 0 });
  });

  it("reconstructs appends after a syllable formation with exact allocation", () => {
    const f = fixture(["æ", "k", "s", "i:"], ["a", "c", "s", "i"], [0, 0, 0, 1], [], true);
    expect(f.trace().surface).toBe("axi");
    expect(f.replay(f.trace())).toMatchObject({ verifiedSharedEvents: 1 });
  });

  it("authenticates normalization certificates and the complete check schedule", () => {
    const f = fixture(["b", "ɛ", "d"], ["b", "e", "ed"], [0, 0, 0], [glyph("d", "d")]);
    expect(f.trace().surface).toBe("bed");
    expect(f.replay(f.trace())).toMatchObject({ verifiedNormalizations: 1, verifiedEpisodes: 1 });
  });

  it("authenticates a whole coverage plan after shared formation", () => {
    const f = fixture(["æ", "g", "z", "i:"], ["a", "g", "z", "ee"], [0, 0, 0, 0], [glyph("i:", "e")]);
    f.shared("gz-to-x", [1, 2]);
    const choices = f.contexts.map((context, id) => ({ ...context, grapheme: f.config.graphemes[id], form: f.base.current().units[id].afterDoubling }));
    expect(createSpellingCoveragePlanner(f.config, undefined, undefined, englishSharedSpellings)
      .apply(f.base, choices, "base-after-word-rules").status).toBe("respell");
    expect(f.replay(f.trace())).toMatchObject({ verifiedCertificates: 1, verifiedSharedEvents: 1 });
  });

  it("accounts for an empty selected unit without consuming a cell ID", () => {
    const f = fixture(["æ", "k", "s"], ["", "c", "s"]);
    expect(f.trace().units[0].sourceCellIds).toEqual([]);
    expect(f.replay(f.trace())).toMatchObject({ verifiedSharedEvents: 0 });
  });

  it.each(["support", "history", "episode", "extra-certificate"])("rejects altered normalization %s", corruption => {
    const f = fixture(["b", "ɛ", "d"], ["b", "e", "ed"], [0, 0, 0], [glyph("d", "d")]);
    const trace = f.trace();
    if (corruption === "support") trace.normalizationCertificates[0].support.effectiveWeight *= 2;
    if (corruption === "history") trace.normalizationCertificates[0].preUnitState.previousForm = "x";
    if (corruption === "episode") trace.normalization.episodes[0].rightCellId++;
    if (corruption === "extra-certificate") trace.normalizationCertificates.push(structuredClone(trace.normalizationCertificates[0]));
    expect(() => f.replay(trace)).toThrow();
  });

  it.each(["append-id", "missing-check", "missing-event", "reorder", "final-live", "standalone"])("rejects %s chronology corruption", corruption => {
    const f = fixture(); f.shared("ks-to-x", [1, 2]);
    const trace = f.trace();
    if (corruption === "append-id") trace.units[0].sourceCellIds[0] = 99;
    if (corruption === "missing-check") trace.shared.timeline.splice(trace.shared.timeline.findIndex(entry => entry.kind === "normalization-check"), 1);
    if (corruption === "missing-event") trace.shared.timeline.pop();
    if (corruption === "reorder") [trace.shared.timeline[0], trace.shared.timeline[1]] = [trace.shared.timeline[1], trace.shared.timeline[0]];
    if (corruption === "final-live") trace.shared.liveConstructionIds = [];
    if (corruption === "standalone") trace.shared.timeline.push({ kind: "normalization", index: 0, cursor: { lastAppendedUnitId: 2, nextEditId: 1 } });
    expect(() => f.replay(trace)).toThrow();
  });
});
