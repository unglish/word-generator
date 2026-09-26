import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";
import type { Word } from "../../../../src/types.js";
import type { BaseSpellingTrace } from "../../../../src/core/base-spelling.js";
import { observeHistoricalNormalization } from "./observe.js";

const bytes = readFileSync(new URL("./fixtures/control-witnesses.json.gz", import.meta.url));
const protocol = JSON.parse(readFileSync(new URL("./protocol.json", import.meta.url), "utf8"));
const fixture = JSON.parse(gunzipSync(bytes).toString("utf8")) as {
  sourceDigest: string; records: Record<string, { word: Word }>;
};
const records = new Map(Object.entries(fixture.records).map(([coordinate, draw]) =>
  [JSON.stringify(JSON.parse(coordinate)), draw.word]));
function record(profile: string, seed: number, draw: number): Word {
  const word = records.get(JSON.stringify([profile, seed, draw]));
  assert.ok(word, "Missing frozen coordinate");
  return word;
}
const base = (word: Word): BaseSpellingTrace => structuredClone(word.trace!.baseSpelling!);
const certificateBytes = readFileSync(new URL("./fixtures/certified-control.json.gz", import.meta.url));
const certificateFixture = JSON.parse(gunzipSync(certificateBytes).toString("utf8")) as {
  sourceDigest: string; record: { word: Word };
};

test("all complete immutable control witnesses replay without mutation", () => {
  assert.equal(createHash("sha256").update(bytes).digest("hex"), protocol.fixtures.sha256);
  assert.equal(fixture.sourceDigest, protocol.control.archiveSourceDigest);
  assert.equal(Object.keys(fixture.records).length, 64);
  for (const { word } of Object.values(fixture.records)) {
    const original = structuredClone(word.trace!.baseSpelling!);
    const counts = observeHistoricalNormalization(word.trace!.baseSpelling!);
    assert.equal(counts.words, 1);
    assert.equal(counts.normalizationEpisodesUnavailableWords, 1);
    assert.equal(counts.prospectiveComparisonsUnavailableWords, 1);
    assert.deepEqual(word.trace!.baseSpelling, original);
  }
});

test("all 31 archived th defects remain distinct from unavailable prospective evidence", () => {
  const selected = protocol.fixtures.partialThCoordinates as Array<[string, number, number]>;
  assert.equal(selected.length, 31);
  for (const coordinate of selected) {
    const counts = observeHistoricalNormalization(base(record(...coordinate)));
    assert.equal(counts.dedupAttributedPartialThUnits, 1);
    assert.equal(counts.wordsWithDedupPartialTh, 1);
  }
});

test("separate identical coda phones are not one doubled unit", () => {
  const word = record("lexicon-default", 69212153, 85);
  const counts = observeHistoricalNormalization(base(word));
  assert.equal(counts.legacySameSoundEvents, 1);
  assert.equal(counts.legacySameUnitEvents, 0);
  assert.equal(counts.legacyWholeUnitEvents, 1);
  assert.equal(counts.dedupAttributedNoLineageUnits, 1);
  assert.ok(word.trace!.structural.some(event => event.event === "finalS"));
});

test("equal c letters for different phones retain the different-sound category", () => {
  const counts = observeHistoricalNormalization(base(record("lexicon-default", 69212153, 1700)));
  assert.equal(counts.legacyDifferentSoundsEvents, 1);
  assert.equal(counts.legacyWholeUnitEvents, 1);
});

test("rewrite ancestry stays unresolved even beside an exact selected unit", () => {
  const counts = observeHistoricalNormalization(base(record("lexicon-default", 69212153, 33)));
  assert.equal(counts.legacyUnresolvedInputEvents, 1);
  assert.equal(counts.legacyPartialUnitEvents, 1);
  assert.equal(counts.legacyDifferentSoundsEvents, 0);
});

test("multiple edits are counted separately from unique word incidence", () => {
  const counts = observeHistoricalNormalization(base(record("lexicon-bare", 772709128, 9423)));
  assert.equal(counts.legacyDedupEvents, 2);
  assert.equal(counts.wordsWithLegacyDedup, 1);
});

test("source ID corruption fails even when the visible letter is unchanged", () => {
  const ledger = base(record("lexicon-default", 69212153, 5789));
  ledger.edits[0].input[0].id++;
  assert.throws(() => observeHistoricalNormalization(ledger), /Exact edit input cells/);
});

test("extra source phones and missing source cells are rejected", () => {
  const ledger = base(record("lexicon-default", 69212153, 5789));
  ledger.phones.push(structuredClone(ledger.phones[0]));
  assert.throws(() => observeHistoricalNormalization(ledger), /cardinality/);
  const missing = base(record("lexicon-default", 69212153, 5789));
  missing.units[0].sourceCellIds.pop();
  assert.throws(() => observeHistoricalNormalization(missing));
});

test("unknown future versions and capabilities are not historical successes", () => {
  const ledger = base(record("lexicon-default", 69212153, 5789));
  const unknownVersion = { ...ledger, version: 3 } as unknown as BaseSpellingTrace;
  assert.throws(() => observeHistoricalNormalization(unknownVersion), /Unsupported normalization ledger version/);
  const unknownCapability = { ...ledger, capabilities: { ...ledger.capabilities, unitNormalization: 1 } } as unknown as BaseSpellingTrace;
  assert.throws(() => observeHistoricalNormalization(unknownCapability), /Unsupported ledger capabilities/);
});

test("rewrite lineage corruption is rejected rather than reclassified as exact ownership", () => {
  const ledger = base(record("lexicon-default", 69212153, 33));
  const rewritten = ledger.edits.flatMap(edit => edit.output).find(cell => cell.origin.kind === "rewrite");
  assert.ok(rewritten?.origin.kind === "rewrite");
  rewritten.origin.sourceUnitIds = [];
  assert.throws(() => observeHistoricalNormalization(ledger));
});

test("an authenticated existing coverage certificate replays structurally", () => {
  assert.equal(createHash("sha256").update(certificateBytes).digest("hex"), protocol.fixtures.certifiedControlFixture.sha256);
  assert.equal(certificateFixture.sourceDigest, protocol.control.archiveSourceDigest);
  const ledger = base(certificateFixture.record.word);
  assert.ok(ledger.certificates?.length);
  assert.doesNotThrow(() => observeHistoricalNormalization(ledger));
});

for (const field of ["offset", "certificate-id", "certificate-identity"] as const) {
  test(`rejects forged licensed ${field} before counting a historical success`, () => {
    const ledger = base(certificateFixture.record.word);
    const licensed = ledger.edits.flatMap(edit => edit.output).find(cell => cell.origin.kind === "licensed");
    assert.ok(licensed?.origin.kind === "licensed");
    if (field === "offset") licensed.origin.offset++;
    if (field === "certificate-id") licensed.origin.certificateId++;
    if (field === "certificate-identity") ledger.certificates![0].id++;
    assert.throws(() => observeHistoricalNormalization(ledger), /Licensed offset|Missing licensed certificate|Licensed certificate identity/);
  });
}

test("v1 compatibility leaves absent part and normalization evidence unavailable", () => {
  // Schema fixture derived from an actual ledger, not a claim of archived v1 provenance.
  const ledger = base(record("lexicon-default", 69212153, 5789));
  ledger.version = 1; delete ledger.capabilities;
  for (const cell of ledger.cells) delete cell.partId;
  for (const edit of ledger.edits) {
    delete edit.partId;
    for (const cell of [...edit.input, ...edit.output]) delete cell.partId;
  }
  const counts = observeHistoricalNormalization(ledger);
  assert.equal(counts.dedupAttributedPartialThUnits, 1);
  assert.equal(counts.normalizationEpisodesUnavailableWords, 1);
});
