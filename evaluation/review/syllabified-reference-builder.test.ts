import { describe, expect, it } from "vitest";
import { parseCmuRecords, selectCompatibleCmu } from "../corpus/cmu.js";
import { jsonDigest } from "../corpus/identity.js";
import { buildSyllabifiedReference } from "../corpus/syllabified-reference-builder.js";
import { countAuditedRootPairs } from "../corpus/uci-root-counts.js";
import { cmuLegacyEnglishAdapter, mapCmuTokens } from "../corpus/variety-adapter.js";
import { buildReference } from "./wordlikeness/model.js";

// The full #304 population licenses TL and K as initial onsets. The audited population has
// three roots. Two surface spellings count toward the root with a move and a missing split.
const dictionary = [
  "e IY1", "atlas AE1 T L AH0 S", "mixed AE1 T L AH0 K K IY2", "mixeds AE1 T L AH0 K K IY2 Z",
  "tlingit T L IH1 NG G IH0 T", "kit K IH1 T", "oh OW1",
].join("\n");
const { entries } = selectCompatibleCmu(parseCmuRecords(dictionary));
const surfaces = entries.slice(0, 4).map(({ line, spelling }) => ({ line, spelling, stem: spelling === "mixeds" ? "mixed" : spelling }));
const roots = entries.slice(0, 3).map(source => ({ source, surfaces: surfaces.filter(surface => surface.stem === source.spelling) }));
const ledger = surfaces.map(surface => ({ ...surface, status: "included" as const }));
const model = buildReference(dictionary, "fixture");
const inputs = {
  population: { roots, entries }, adapter: cmuLegacyEnglishAdapter, frozen: { model, digest: jsonDigest(model) },
  census: countAuditedRootPairs({ roots: roots.map(root => root.source), ledger }, {}, { S: "s" }),
};

describe("syllabified reference builder", () => {
  it("reconciles the census and #304 then counts moves and abstentions separately, including on partially covered roots", async () => {
    const lines: string[] = [];
    const report = await buildSyllabifiedReference(inputs, line => { lines.push(line); });
    const rows = lines.map(line => JSON.parse(line));
    expect(lines.every(line => line.endsWith("\n"))).toBe(true);
    expect(rows.map(row => row.source.spelling)).toEqual(["e", "atlas", "mixed"]);
    expect(rows[0].phones).toMatchObject([{ raw: "IY1", index: 0, stress: 1 }]);
    expect(rows[2].splits["config-legal"]).toMatchObject({ status: "unavailable",
      boundaries: [{ chosenCodaSize: 1 }, { chosenCodaSize: null }] });
    expect(report.parity304.countsDigest).toBe(jsonDigest(model.constituents));
    expect(report.expectedTotals).toEqual({
      distinct: { rows: 3, phones: 13, pairs: 10 }, surfaceWeighted: { rows: 4, phones: 20, pairs: 16 },
    });
    expect(report.policies.find(tables => tables.policy === "config-legal")).toMatchObject({
      changesFrom304: { total: 4, counts: { equal: 1, different: 1, unavailable: 2 } },
      boundaryChangesFrom304: { total: 3, counts: { "2|1>0|T L|0>1": 3 } },
      unavailableBoundariesFrom304: { total: 2, counts: { "2|0>2|K K|1>unavailable": 2 } },
    });
  });

  it.each(["IY1", "OW1"])("catches a substituted single phone %s before emitting rows", async token => {
    // Primary and secondary stress pool in #304, and a one-phone row contributes no pair to the census.
    // IY1 belongs to an audited root. OW1 occurs only in the full compatibility population.
    const adapter = { ...cmuLegacyEnglishAdapter, mapReference: (tokens: readonly string[]) =>
      mapCmuTokens(tokens[0] === token ? [token.replace("1", "2")] : tokens) };
    const lines: string[] = [];
    await expect(buildSyllabifiedReference({ ...inputs, adapter }, line => { lines.push(line); }))
      .rejects.toThrow(`Expected ${token} at original index 0`);
    expect(lines).toEqual([]);
  });

  it("rejects an incorrect frozen reference before emitting rows", async () => {
    const wrongModel = buildReference("other DH AH1 DH ER0", "fixture");
    const lines: string[] = [];
    await expect(buildSyllabifiedReference({ ...inputs, frozen: { digest: jsonDigest(wrongModel), model: wrongModel } },
      line => { lines.push(line); })).rejects.toThrow("Recount differs from frozen #304 constituents");
    expect(lines).toEqual([]);
  });

  it("rejects a wrong census cell even when all expected totals agree", async () => {
    const [first, ...others] = inputs.census.rows;
    const census = { ...inputs.census, rows: [{ ...first, left: "X" }, ...others] };
    const lines: string[] = [];
    await expect(buildSyllabifiedReference({ ...inputs, census }, line => { lines.push(line); })).rejects.toThrow("cell 1");
    expect(lines).toEqual([]);
  });
});
