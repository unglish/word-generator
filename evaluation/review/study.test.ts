import { describe, expect, it } from "vitest";
import { canonical, digest, freezeStudy, validateSnapshot } from "./snapshot.js";
import { fixtureExport, fixtureSnapshot } from "./fixtures.js";
import { buildReport, reportMarkdown, responseCsv } from "./report.js";
import { OwnerApi } from "./owner-api.js";

describe("frozen study provenance", () => {
  it("captures reproducible full generator output and source", async () => {
    const first = await freezeStudy(process.cwd(), "test-reproducibility", 42, 25);
    const second = await freezeStudy(process.cwd(), "test-reproducibility", 42, 25);
    expect(first).toEqual(second);
    expect(first.manifest.generator.source_files.some(file => file.path === "src/core/generate.ts")).toBe(true);
    expect(first.samples.every(sample => sample.word.trace && sample.word.pronunciation && sample.word.syllables.length)).toBe(true);
    validateSnapshot(first);
  });
  it("supports a partial first batch without changing the configured batch limit", async () => {
    const small = await freezeStudy(process.cwd(), "test-small-pool", 42, 3);
    expect(small.manifest.session_length).toBe(20);
    expect(small.samples).toHaveLength(3);
    validateSnapshot(small);
  });
  it("preserves Maps, regexes, and deterministic object order", () => {
    expect(canonical({ map: new Map([["x", /ab/i]]) })).toEqual({ map: { $type: "Map", entries: [["x", { $type: "RegExp", source: "ab", flags: "i" }]] } });
    expect(digest({ b: 2, a: 1 })).toBe(digest({ a: 1, b: 2 }));
  });
  it("rejects altered metadata, content, and identifiers", () => {
    for (const mutate of [
      (s: ReturnType<typeof fixtureSnapshot>) => { s.samples[0].spelling = "changed"; },
      (s: ReturnType<typeof fixtureSnapshot>) => { s.manifest.options.seed++; },
      (s: ReturnType<typeof fixtureSnapshot>) => { s.samples[0].id = "foreign"; },
    ]) { const s = fixtureSnapshot(); mutate(s); expect(() => validateSnapshot(s)).toThrow(); }
  });
});

describe("descriptive report", () => {
  it("weights duplicate draws, not unequal rating counts, and separates familiarity", () => {
    const report = buildReport(fixtureExport());
    expect(report.coverage).toEqual({ draws: 4, distinct_spellings: 3, rated_spellings: 2, sessions_started: 3, sessions_completed: 1, ratings: 5, skips: 1, spellings_with_three_sessions: 1 });
    // blim is 2/3 of covered draws: half 1s, half 5s. sproke is 1/3, all 4s.
    expect(report.all.proportions).toEqual([1 / 3, 0, 0, 1 / 3, 1 / 3]);
    expect(report.all.share_4_5).toBeCloseTo(2 / 3);
    expect(report.all.covered_draws).toBe(3);
    expect(report.unfamiliar.proportions).toEqual([0, 0, 0, 1 / 3, 2 / 3]);
    expect(report.familiarity.response_rate).toBe(.2);
    expect(reportMarkdown(report)).toContain("Sessions are not verified distinct people");
    expect(responseCsv(fixtureExport())).toContain("\"0;1\"");
  });
  it("keeps missing and skipped-only data null rather than zero", () => {
    const data = fixtureExport();
    data.responses = data.responses.filter(response => response.status === "skipped");
    expect(buildReport(data).all.share_4_5).toBeNull();
    expect(buildReport(data).all.proportions).toEqual([null, null, null, null, null]);
  });
  it("rejects invalid assignment and duplicate response exports", () => {
    const data = fixtureExport();
    data.responses.push(data.responses[0]);
    expect(() => buildReport(data)).toThrow("duplicate");
    data.responses.pop();
    data.sessions[0].assignments[0] = data.sessions[0].assignments[1];
    expect(() => buildReport(data)).toThrow("assignment");
  });
});

it("exports all pages with stable keyset pagination", async () => {
  const requests: URL[] = [];
  const rows = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  const transport: typeof fetch = async input => {
    const url = new URL(String(input));
    requests.push(url);
    const after = url.searchParams.get("id")?.slice(3) ?? "";
    return new Response(JSON.stringify(rows.filter(row => row.id > after).slice(0, 2)));
  };
  // The server may cap pages below the requested size.
  expect(await new OwnerApi("http://localhost", "test-key", transport).rows("review_responses", {}, "*", 3)).toEqual(rows);
  expect(requests).toHaveLength(3);
  expect(requests[1].searchParams.get("id")).toBe("gt.b");
});

it("keeps the original and revised studies independently verifiable with identical draws", async () => {
  const { readFile } = await import("node:fs/promises");
  const old = JSON.parse(await readFile("evaluation/review/studies/written-v1-baseline.json", "utf8"));
  const current = JSON.parse(await readFile("evaluation/review/studies/written-v2-baseline.json", "utf8"));
  validateSnapshot(old);
  validateSnapshot(current);
  expect(current.manifest.rubric.version).toBe("written-v2");
  expect(old.manifest.rubric.version).toBe("written-v1");
  expect(current.samples.map((s: { word: unknown }) => s.word)).toEqual(old.samples.map((s: { word: unknown }) => s.word));
  expect(current.manifest.generator).toEqual(old.manifest.generator);
  expect(current.digest).not.toBe(old.digest);
  expect(current.samples[0].id).not.toBe(old.samples[0].id);
});

it("exports comments as text and retains the original in JSON data", () => {
  const data = fixtureExport();
  data.responses[0].comment = "=SUM(1,2)";
  expect(responseCsv(data)).toContain("'=SUM(1,2)");
  expect(data.responses[0].comment).toBe("=SUM(1,2)");
});

it("reports partial linked batches and preserves old exports without inventing chains", () => {
  const legacy = fixtureExport();
  expect(responseCsv(legacy)).toContain("\"session_id\",\"chain_id\",\"previous_session_id\"");
  expect(legacy.sessions.every(session => session.chain_id === undefined)).toBe(true);
  const data = fixtureExport();
  data.sessions = data.sessions.slice(0, 2);
  data.sessions[0].assignments = data.sessions[0].assignments.slice(0, 2);
  data.sessions[1].assignments = [data.samples[3].id];
  data.sessions[0].chain_id = "chain-a";
  data.sessions[0].previous_session_id = null;
  data.sessions[1].chain_id = "chain-a";
  data.sessions[1].previous_session_id = data.sessions[0].id;
  data.responses = [data.responses[0], data.responses[2], { ...data.responses[5], session_id: data.sessions[1].id, position: 0 }];
  expect(buildReport(data).coverage.sessions_completed).toBe(2);
  expect(responseCsv(data)).toContain("\"s2\",\"chain-a\",\"s1\"");
  data.sessions[1].chain_id = "another-chain";
  expect(() => buildReport(data)).toThrow("chain relationship");
  data.sessions[1].chain_id = "chain-a";
  data.sessions[1].assignments = [data.samples[1].id];
  expect(() => buildReport(data)).toThrow("Repeated spelling");
});
