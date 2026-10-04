import { expect, it } from "vitest";
import { FinalSpelling, replayFinalSpelling } from "./final-spelling.js";
import { replaceWithSpellingEdits } from "./spelling-regex-edits.js";

it("retains unchanged base cells and records exact replacement and affix origins", () => {
  const base = "aaaa".split("").map((text, id) => ({ id: id + 10, text, origin: { kind: "selection" as const, unitId: id, offset: 0 } }));
  const ledger = new FinalSpelling("aaaa", base);
  const edit = replaceWithSpellingEdits("aaaa", /a$/, "e");
  ledger.applyRootEdits("aaaa", edit.surface, edit.edits, "last-a");
  ledger.attach("prefix", "un"); ledger.attach("suffix", "s");
  const trace = ledger.snapshot();
  expect(trace.surface).toBe("unaaaes");
  expect(trace.cells.slice(2, 5).map(cell => cell.source)).toEqual([10, 11, 12].map(cellId => ({ kind: "base-cell", cellId })));
  expect(trace.events[0].inputIds).toEqual([3]);
  expect(trace.cells[5].source).toEqual({ kind: "edit", eventId: 0, offset: 0 });
  trace.cells[0].text = "x";
  expect(ledger.snapshot().surface).toBe("unaaaes");
});
it("applies original-coordinate global edits in operation order", () => {
  const ledger = new FinalSpelling("abab");
  const edit = replaceWithSpellingEdits("abab", /a/g, "xyz");
  ledger.applyRootEdits("abab", edit.surface, edit.edits, "expand");
  expect(ledger.snapshot().surface).toBe("xyzbxyzb");
  expect(ledger.snapshot().events.map(event => event.start)).toEqual([0, 4]);
});
it("rejects wrong source cells and forged mutation spans", () => {
  expect(() => new FinalSpelling("a", [])).toThrow();
  const ledger = new FinalSpelling("a");
  expect(() => ledger.replace("root", 0, "b", "c", "bad")).toThrow();
  expect(() => ledger.applyRootEdits("a", "b", [], "bad")).toThrow();
});

it("replays cell identities and rejects provenance corruption even with unchanged text", () => {
  const ledger = new FinalSpelling("ab");
  ledger.replace("root", 0, "a", "a", "same-text");
  ledger.attach("suffix", "s");
  const trace = ledger.snapshot();
  expect(replayFinalSpelling(trace)).toEqual(trace.cells);
  const variants = [
    (copy: typeof trace) => { copy.events = []; },
    (copy: typeof trace) => { copy.events[0].inputIds[0] = 42; },
    (copy: typeof trace) => { copy.events[0].outputIds[0] = copy.initial[0].id; },
    (copy: typeof trace) => { copy.cells[0].source = { kind: "unresolved-root", offset: 0 }; },
    (copy: typeof trace) => { copy.initial[2].source = { kind: "affix", offset: 7 }; },
  ];
  for (const change of variants) {
    const copy = structuredClone(trace); change(copy);
    expect(() => replayFinalSpelling(copy)).toThrow();
  }
});

it("detaches all mutable spelling snapshot fields", () => {
  const ledger = new FinalSpelling("cat");
  ledger.attach("prefix", "un");
  ledger.replace("root", 1, "a", "ee", "test");
  const expected = ledger.snapshot();
  const snapshot = ledger.snapshot();
  snapshot.cells[0].source = { kind: "edit", eventId: 999, offset: 9 };
  snapshot.initial[0].source = { kind: "affix", offset: 999 };
  snapshot.events[0].inputIds.push(999);
  snapshot.events[0].outputIds.length = 0;
  snapshot.cells.length = 0;
  snapshot.initial[0].text = "x";
  expect(ledger.snapshot()).toEqual(expected);
});
