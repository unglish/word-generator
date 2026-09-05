import { randomUUID, randomBytes } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { OwnerApi } from "./owner-api.js";
import { fixtureSnapshot } from "./fixtures.js";
import type { Assignment, Submission } from "./protocol.js";
import type { SessionRow, ResponseRow } from "./model.js";

const url = process.env.REVIEW_TEST_URL ?? "";
const key = process.env.REVIEW_TEST_KEY ?? "";
const owner = new OwnerApi(url, process.env.REVIEW_TEST_SECRET ?? "");
const study = fixtureSnapshot(`test-${randomUUID()}`);
const credentials = () => ({ study_id: study.manifest.study_id, session_id: randomUUID(), submission_token: randomBytes(32).toString("hex") });
const request = (resource: string, method = "GET", body?: unknown, headers = {}) => fetch(`${url}/rest/v1/${resource}`, {
  method, headers: { apikey: key, "Content-Type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body),
});
const rpc = (name: string, body: unknown) => request(`rpc/${name}`, "POST", body);
const answer = (c: ReturnType<typeof credentials>, position = 0): Submission => ({ session_id: c.session_id, submission_token: c.submission_token, response_id: randomUUID(), position, status: "rated", rating: 4, familiar: false });

beforeAll(async () => { await owner.importStudy(study); });
afterAll(async () => {
  const sessions = await owner.rows<SessionRow>("review_sessions", { study_id: `eq.${study.manifest.study_id}` });
  for (const session of sessions) await owner.request(`review_responses?session_id=eq.${session.id}`, "DELETE");
  await owner.request(`review_studies?id=eq.${study.manifest.study_id}`, "DELETE");
});

describe("anonymous HTTP boundary", () => {
  it("denies raw reads and mutations, including return representations", async () => {
    const c = credentials();
    await rpc("start_review", c);
    const submitted = answer(c);
    await rpc("submit_review_response", submitted);
    const cases = [
      { table: "review_studies", id: study.manifest.study_id, insert: { id: study.manifest.study_id, manifest: study.manifest, digest: study.digest, session_length: 3 }, patch: { enrollment_open: false } },
      { table: "review_samples", id: study.samples[0].id, insert: study.samples[0], patch: { spelling: study.samples[0].spelling } },
      { table: "review_sessions", id: c.session_id, insert: { id: c.session_id, study_id: study.manifest.study_id, token_hash: "\\x00", assignments: [study.samples[0].id] }, patch: { completed_at: null } },
      { table: "review_responses", id: submitted.response_id, insert: { id: submitted.response_id, session_id: c.session_id, position: 0, sample_id: study.samples[0].id, status: "rated", rating: 4, familiar: false }, patch: { rating: 5 } },
    ];
    for (const { table, id, insert, patch } of cases) {
      for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
        let body;
        if (method === "POST") body = insert;
        if (method === "PATCH") body = patch;
        const response = await request(`${table}?id=eq.${id}`, method, body, { Prefer: "return=representation" });
        const text = await response.text();
        expect([401, 403], `${method} ${table}: ${text}`).toContain(response.status);
        expect(text).not.toContain(study.samples[0].spelling);
      }
    }
    const hidden = await request("rpc/start_review", "POST", credentials(), { "Content-Profile": "private" });
    expect(hidden.ok).toBe(false);
  });

  it("creates exactly one blinded assignment under concurrent retries", async () => {
    const c = credentials();
    const replies = await Promise.all([rpc("start_review", c), rpc("start_review", c)]);
    expect(replies.map(response => response.status)).toEqual([200, 200]);
    const [a, b] = await Promise.all(replies.map(response => response.json() as Promise<Assignment>));
    expect(a).toEqual(b);
    expect(new Set(a.items.map(item => item.spelling)).size).toBe(3);
    expect(Object.keys(a).sort()).toEqual(["items", "rubric"]);
    expect(Object.keys(a.items[0]).sort()).toEqual(["position", "sample_id", "spelling"]);
    expect(JSON.stringify(a)).not.toMatch(/trace|pronunciation|source_digest|responses/);
    expect(await owner.rows("review_sessions", { id: `eq.${c.session_id}` })).toHaveLength(1);
    expect((await rpc("start_review", { ...c, submission_token: "a".repeat(64) })).status).toBe(403);
    const response = answer(c);
    await rpc("submit_review_response", response);
    expect(await (await rpc("start_review", c)).json()).toEqual(a);
  });

  it("acknowledges identical retries and rejects conflicting values or IDs", async () => {
    const c = credentials();
    expect((await rpc("start_review", c)).status).toBe(200);
    const response = answer(c);
    const replies = await Promise.all([rpc("submit_review_response", response), rpc("submit_review_response", response)]);
    for (const reply of replies) expect(await reply.json()).toEqual({ accepted: true, response_id: response.response_id });
    expect(await owner.rows<ResponseRow>("review_responses", { session_id: `eq.${c.session_id}` })).toHaveLength(1);
    expect((await rpc("submit_review_response", { ...response, rating: 1 })).status).toBe(409);
    expect((await rpc("submit_review_response", { ...response, response_id: randomUUID() })).status).toBe(409);
    expect((await rpc("submit_review_response", { ...response, position: 1 })).status).toBe(409);
    expect((await rpc("submit_review_response", { ...answer(c, 1), submission_token: "b".repeat(64) })).status).toBe(403);
  });

  it("validates scores, status, nulls, and assignment positions", async () => {
    const c = credentials();
    await rpc("start_review", c);
    for (const changed of [{ rating: 0 }, { rating: 6 }, { familiar: null }, { position: -1 }, { position: 20 }, { status: "unknown" }, { status: "skipped" }, { rating: null }, { status: null }]) {
      expect((await rpc("submit_review_response", { ...answer(c), ...changed })).status).toBe(400);
    }
    expect((await rpc("submit_review_response", { ...answer(c), status: "skipped", rating: null, familiar: null })).status).toBe(200);
  });

  it("exports reconstructable judgments and preserves closed-study retries", async () => {
    const c = credentials();
    const first = await (await rpc("start_review", c)).json();
    await owner.request(`review_studies?id=eq.${study.manifest.study_id}`, "PATCH", { enrollment_open: false });
    expect((await rpc("start_review", credentials())).status).toBe(404);
    expect(await (await rpc("start_review", c)).json()).toEqual(first);
    for (let position = 0; position < 3; position++) expect((await rpc("submit_review_response", answer(c, position))).status).toBe(200);
    const exported = await owner.exportStudy(study.manifest.study_id);
    expect(exported.sessions.find(session => session.id === c.session_id)?.completed_at).toBeTruthy();
    expect(exported.responses.filter(response => response.session_id === c.session_id)).toHaveLength(3);
    expect(JSON.stringify(exported)).not.toContain("token_hash");
    expect(exported.samples).toEqual(study.samples);
    await owner.importStudy(study);
    const conflicting = structuredClone(study);
    conflicting.manifest.options.seed++;
    await expect(owner.importStudy(conflicting)).rejects.toThrow();
  });

  it("stores private comments on ratings and skips with immutable retries", async () => {
    const c = credentials();
    await rpc("start_review", c);
    const response = { ...answer(c), comment: "A familiar ending, but not a word I know.\nSecond line." };
    expect((await rpc("submit_review_response", { ...response, comment: "x".repeat(2001) })).status).toBe(400);
    expect((await rpc("submit_review_response", response)).status).toBe(200);
    expect((await rpc("submit_review_response", response)).status).toBe(200);
    expect((await rpc("submit_review_response", { ...response, comment: "Changed" })).status).toBe(409);
    expect((await rpc("submit_review_response", { ...answer(c, 1), status: "skipped", rating: null, familiar: null, comment: "Unsure" })).status).toBe(200);
    const exported = await owner.exportStudy(study.manifest.study_id);
    expect(exported.responses.find(r => r.id === response.response_id)?.comment).toBe(response.comment);
    expect(exported.responses.filter(r => r.session_id === c.session_id)).toHaveLength(2);
  });

  it("balances assignments and prioritizes coverage independently of rating values", async () => {
    const pool = fixtureSnapshot(`test-coverage-${randomUUID()}`, ["blim", "sproke", "thindle", "glave", "prane", "strem"], 2);
    await owner.importStudy(pool);
    const starts = [];
    try {
      for (let i = 0; i < 3; i++) {
        const c = { ...credentials(), study_id: pool.manifest.study_id };
        const assigned: Assignment = await (await rpc("start_review", c)).json();
        starts.push({ c, assigned });
      }
      expect(new Set(starts.flatMap(start => start.assigned.items.map(item => item.sample_id))).size).toBe(6);
      for (let position = 0; position < 2; position++) {
        const response = await rpc("submit_review_response", { ...answer(starts[0].c, position), rating: position ? 1 : 5 });
        expect(response.status).toBe(200);
      }
      const c = { ...credentials(), study_id: pool.manifest.study_id };
      const assigned: Assignment = await (await rpc("start_review", c)).json();
      starts.push({ c, assigned });
      const rated = new Set(starts[0].assigned.items.map(item => item.sample_id));
      expect(assigned.items.every(item => !rated.has(item.sample_id))).toBe(true);
    } finally {
      for (const { c } of starts) await owner.request(`review_responses?session_id=eq.${c.session_id}`, "DELETE");
      await owner.request(`review_studies?id=eq.${pool.manifest.study_id}`, "DELETE");
    }
  });
});
