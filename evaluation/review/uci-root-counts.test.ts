import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { expect, it } from "vitest";
import { jsonDigest } from "../corpus/identity.js";
import { countAuditedRootPairs } from "../corpus/uci-root-counts.js";

it("counts each internal pair once per stem and once per retained surface, preserving both flanking stresses", () => {
  const population = {
    roots: [
      { spelling: "long", tokens: ["S", "T", "AA1", "M", "N", "AE0", "IH2", "K", "S"] },
      { spelling: "hiatus", tokens: ["AE2", "IH0"] },
      { spelling: "mono", tokens: ["IY1"] },
      { spelling: "removed", tokens: ["B", "AE1", "D", "Z"] },
    ],
    ledger: [
      ...["long", "long", "hiatus", "mono", "removed", "removed"].map(stem => ({ status: "included" as const, stem })),
      { status: "too-many-affixes" as const, stem: "long" },
    ],
  };
  const counts = countAuditedRootPairs(population, { "d z": ["removed"] }, { D: "d", Z: "z" });
  expect(counts.retained).toEqual({ distinctStems: 3, surfaceObservations: 4 });
  expect(counts.removed).toEqual({ distinctStems: 1, surfaceObservations: 2 });
  expect(counts.pairTotals).toEqual({ stemWeightedOccurrences: 9, surfaceWeightedOccurrences: 17 });
  const actual = counts.rows.map(row => [row.slot, row.left, row.right, row.leftStress, row.rightStress, row.stemWeightedOccurrences, row.surfaceWeightedOccurrences]);
  expect(actual).toEqual([
    ["final-CC", "K", "S", 2, null, 1, 2],
    ["final-VC", "IH", "K", 2, null, 1, 2],
    ["hiatus-VV", "AE", "IH", 0, 2, 1, 2],
    ["hiatus-VV", "AE", "IH", 2, 0, 1, 1],
    ["initial-CC", "S", "T", null, 1, 1, 2],
    ["initial-CV", "T", "AA", null, 1, 1, 2],
    ["medial-CC", "M", "N", 1, 0, 1, 2],
    ["medial-CV", "N", "AE", 1, 0, 1, 2],
    ["medial-VC", "AA", "M", 1, 0, 1, 2],
  ]);
});

it("requires an audited spelling to match its terminal coda", () => {
  const population = { roots: [{ spelling: "stem", tokens: ["EH1", "K"] }], ledger: [{ status: "included" as const, stem: "stem" }] };
  expect(() => countAuditedRootPairs(population, { "z": ["stem"] }, { K: "k" })).toThrow("Coda audit mismatch for stem");
});

it("counts a repeated stressed-context pair twice within one stem", () => {
  const stem = "dillydally";
  const counts = countAuditedRootPairs({
    roots: [{ spelling: stem, tokens: ["D", "IH1", "L", "IY0", "D", "AE1", "L", "IY0"] }],
    ledger: [{ stem, status: "included" }, { stem, status: "included" }],
  }, {}, {});
  expect(counts.retained).toEqual({ distinctStems: 1, surfaceObservations: 2 });
  expect(counts.rows).toContainEqual({ slot: "medial-CV", left: "L", right: "IY", leftStress: 1, rightStress: 0,
    stemWeightedOccurrences: 2, surfaceWeightedOccurrences: 4 });
});

it("pins the complete audited table and reconciles both observation units", () => {
  const path = new URL("../corpus/uci-root-pairs-v2.json.gz", import.meta.url);
  const { digest, reference } = JSON.parse(gunzipSync(readFileSync(path)).toString());
  expect(digest).toBe("06f1b3e75ce4dc49b8f081d193eceb9e1580354034e8bd3f271f9d70692cfe8d");
  expect(jsonDigest(reference)).toBe(digest);
  expect(reference.retained).toEqual({ distinctStems: 20851, surfaceObservations: 42670 });
  expect(reference.pairTotals).toEqual({ stemWeightedOccurrences: 116157, surfaceWeightedOccurrences: 212430 });
  for (const unit of ["stemWeightedOccurrences", "surfaceWeightedOccurrences"] as const) {
    expect(reference.rows.reduce((sum: number, row: Record<typeof unit, number>) => sum + row[unit], 0)).toBe(reference.pairTotals[unit]);
  }
});
