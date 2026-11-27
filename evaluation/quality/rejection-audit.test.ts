import { expect, it } from "vitest";
import { validateSelection } from "../../scripts/audit-rejection-trace.js";
import { findExample } from "../../src/test-support/find-example.js";

it("audits the selected root length before medial-onset doubling", () => {
  const { word } = findExample(candidate =>
    candidate.trace?.baseSpelling?.edits.some(edit => edit.rule === "medialOnsetDoubling") ?? false, {
    property: "a bare disyllable with a doubled medial onset",
    options: { mode: "lexicon", syllableCount: 2, morphology: false }, limit: 500,
  });
  const selection = word.trace!.selection!;
  expect(selection.selected.letters).toBe(word.written.clean.length - 1);
  expect(() => validateSelection(word, selection)).not.toThrow();
  const surfaceLength = { ...selection, selected: { ...selection.selected, letters: word.written.clean.length } };
  expect(() => validateSelection(word, surfaceLength)).toThrow("Inconsistent selection trace");
});
