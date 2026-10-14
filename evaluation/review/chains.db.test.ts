import { createHash, randomBytes, randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { OwnerApi } from "./owner-api.js";
import { fixtureSnapshot } from "./fixtures.js";
import { parseAssignment, parseContinuation } from "./protocol.js";
import type { Assignment, Continuation, Submission } from "./protocol.js";
import type { SessionRow, Snapshot } from "./model.js";
import { responseCsv, validateExport } from "./report.js";

const url = process.env.REVIEW_TEST_URL!;
const key = process.env.REVIEW_TEST_KEY!;
const owner = new OwnerApi(url, process.env.REVIEW_TEST_SECRET!);
const studies: Snapshot[] = [];
interface Credentials { study_id: string; session_id: string; submission_token: string }
const credentials = (study: Snapshot): Credentials => ({ study_id: study.manifest.study_id, session_id: randomUUID(), submission_token: randomBytes(32).toString("hex") });
type NextBatch = Extract<Continuation, { exhausted: false }>;

async function rpc(name: string, body: unknown): Promise<Response> {
  return fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}
async function start(c: Credentials): Promise<Assignment> {
  const response = await rpc("start_review", c);
  expect(response.status, await response.clone().text()).toBe(200);
  return parseAssignment(await response.json());
}
async function continued(c: Credentials): Promise<Continuation> {
  const response = await rpc("continue_review", c);
  expect(response.status, await response.clone().text()).toBe(200);
  return parseContinuation(await response.json());
}
function nextCredentials(c: Credentials, result: Continuation): Credentials {
  if (result.exhausted) throw new Error("Expected another batch.");
  return { study_id: c.study_id, session_id: result.session_id, submission_token: result.submission_token };
}
async function complete(c: Credentials, assignment: Assignment): Promise<Submission[]> {
  const responses: Submission[] = [];
  for (const item of assignment.items) {
    const response: Submission = {
      session_id: c.session_id, submission_token: c.submission_token, response_id: randomUUID(), position: item.position,
      status: "skipped", rating: null, familiar: null,
    };
    expect(await (await rpc("submit_review_response", response)).json()).toEqual({ accepted: true, response_id: response.response_id });
    responses.push(response);
  }
  return responses;
}
async function pool(spellings: string[], length = 20): Promise<Snapshot> {
  const study = fixtureSnapshot(`test-chains-${randomUUID()}`, spellings, length);
  studies.push(study);
  await owner.importStudy(study);
  return study;
}
const words = (count: number) => Array.from({ length: count }, (_, i) => `word${i}`);

afterAll(async () => {
  for (const study of studies) {
    const sessions = await owner.rows<SessionRow>("review_sessions", { study_id: `eq.${study.manifest.study_id}` });
    for (const session of sessions) await owner.request(`review_responses?session_id=eq.${session.id}`, "DELETE");
    await owner.request(`review_studies?id=eq.${study.manifest.study_id}`, "DELETE");
  }
});

describe("anonymous review chains", () => {
  it("allows a study whose whole pool is shorter than its batch limit", async () => {
    const study = await pool(["blim", "blim"]);
    const c = credentials(study);
    const assignment = await start(c);
    expect(assignment.items.map(item => item.spelling)).toEqual(["blim"]);
    await complete(c, assignment);
    expect(await continued(c)).toEqual({ exhausted: true });
    expect((await owner.exportStudy(c.study_id)).sessions).toHaveLength(1);
  });

  it("deduplicates draws across 20/20/5 batches, then durably exhausts without allocating empty sessions", async () => {
    const study = await pool([...words(45), ...words(15)]);
    let c = credentials(study);
    const root = c;
    let assignment = await start(c);
    const seen = new Set<string>();
    let firstContinuation: Continuation | undefined;
    for (const length of [20, 20, 5]) {
      expect(assignment.items).toHaveLength(length);
      for (const item of assignment.items) {
        expect(seen.has(item.spelling)).toBe(false);
        seen.add(item.spelling);
        expect(item.sample_id).toBe(study.samples.find(sample => sample.spelling === item.spelling)!.id);
      }
      await complete(c, assignment);
      const next = await continued(c);
      expect(await continued(c)).toEqual(next);
      if (length === 5) {
        expect(next).toEqual({ exhausted: true });
      } else {
        firstContinuation ??= next;
        c = nextCredentials(c, next);
        assignment = (next as NextBatch).assignment;
        expect(await start(c)).toEqual(assignment);
      }
    }
    expect(seen.size).toBe(45);
    expect(await continued(root)).toEqual(firstContinuation);
    const exported = await owner.exportStudy(study.manifest.study_id);
    validateExport(exported);
    expect(exported.sessions).toHaveLength(3);
    expect(new Set(exported.sessions.map(session => session.chain_id)).size).toBe(1);
    expect(exported.sessions.find(session => session.id === root.session_id)?.previous_session_id).toBeNull();
    expect(exported.responses).toHaveLength(45);
    expect(JSON.stringify(exported)).not.toMatch(/token|credential/);
    expect(responseCsv(exported)).toContain("\"chain_id\",\"previous_session_id\"");
    expect(responseCsv(exported)).toContain(exported.sessions[0].chain_id!);
  });

  it("reuses one successor for concurrent requests and retries after progress and enrollment closes", async () => {
    const study = await pool(words(5), 2);
    const c = credentials(study);
    const first = await start(c);
    const responses = await complete(c, first);
    const results = await Promise.all(Array.from({ length: 6 }, () => continued(c)));
    for (const result of results) expect(result).toEqual(results[0]);
    const next = results[0] as NextBatch;
    const following = nextCredentials(c, next);
    const rows = await owner.rows<SessionRow>("review_sessions", { study_id: `eq.${c.study_id}` });
    expect(rows).toHaveLength(2);
    expect(rows.find(row => row.id === following.session_id)?.previous_session_id).toBe(c.session_id);
    await complete(following, next.assignment);
    const third = await continued(following);
    await owner.request(`review_studies?id=eq.${c.study_id}`, "PATCH", { enrollment_open: false });
    expect(await continued(c)).toEqual(next);
    expect(await continued(following)).toEqual(third);
    expect(await start(following)).toEqual(next.assignment);
    // Submission retry acknowledgements remain exact even after continuation.
    expect(await (await rpc("submit_review_response", responses[0])).json()).toEqual({ accepted: true, response_id: responses[0].response_id });
    const final = third as NextBatch;
    const last = nextCredentials(c, final);
    await complete(last, final.assignment);
    expect((await rpc("continue_review", last)).status).toBe(404);
  });

  it("retains coverage balancing among eligible spellings across independent chains", async () => {
    const study = await pool(words(6), 2);
    const a = credentials(study), b = credentials(study);
    const first = await start(a), second = await start(b);
    await complete(a, first);
    const next = await continued(a) as NextBatch;
    expect(new Set([...first.items, ...second.items, ...next.assignment.items].map(item => item.spelling)).size).toBe(6);
    const sessions = await owner.rows<SessionRow>("review_sessions", { study_id: `eq.${a.study_id}` });
    expect(sessions.find(session => session.id === a.session_id)?.chain_id).not.toBe(sessions.find(session => session.id === b.session_id)?.chain_id);
  });

  it("requires completed-session authorization and exposes no chain metadata or judgments anonymously", async () => {
    const study = await pool(words(4), 2);
    const c = credentials(study);
    await start(c);
    expect((await rpc("continue_review", c)).status).toBe(409);
    await complete(c, await start(c));
    for (const changed of [{ submission_token: "a".repeat(64) }, { session_id: randomUUID() }, { study_id: "another-study" }]) {
      expect((await rpc("continue_review", { ...c, ...changed })).status).toBe(403);
    }
    for (const changed of [{ submission_token: null }, { submission_token: "bad" }, { session_id: null }, { study_id: null }]) {
      expect((await rpc("continue_review", { ...c, ...changed })).status).toBe(400);
    }
    const next = await continued(c) as NextBatch;
    expect(Object.keys(next).sort()).toEqual(["assignment", "exhausted", "session_id", "submission_token"]);
    expect(JSON.stringify(next)).not.toMatch(/chain_id|previous_session_id|completed_at|responses|rating|trace|token_hash/);
    expect((await rpc("start_review", { ...c, session_id: next.session_id })).status).toBe(403);
    for (const name of ["review_assignment", "choose_review_samples"]) {
      expect((await rpc(name, { session_id: c.session_id })).ok).toBe(false);
    }
    const raw = await fetch(`${url}/rest/v1/review_sessions?select=chain_id,previous_session_id`, { headers: { apikey: key } });
    expect([401, 403]).toContain(raw.status);
  });

  it("continues legacy session rows and preserves prior responses without inferring historical links", async () => {
    const study = await pool(["blim", "blim", "sproke", "thindle"], 2);
    const a = credentials(study), b = credentials(study);
    // The pre-chain row shape intentionally omits every new column, and uses a
    // duplicate draw ID to verify exclusion is by spelling rather than ID.
    for (const c of [a, b]) await owner.request("review_sessions", "POST", {
      id: c.session_id, study_id: c.study_id,
      token_hash: `\\x${createHash("sha256").update(c.submission_token).digest("hex")}`,
      assignments: [study.samples[1].id, study.samples[2].id],
    });
    const before = await start(a);
    const responses = await complete(a, before);
    const next = await continued(a) as NextBatch;
    expect(next.assignment.items.map(item => item.spelling)).toEqual(["thindle"]);
    expect(await start(a)).toEqual(before);
    const exported = await owner.exportStudy(a.study_id);
    expect(exported.responses.map(response => response.id).sort()).toEqual(responses.map(response => response.response_id).sort());
    const rowA = exported.sessions.find(session => session.id === a.session_id)!;
    const rowB = exported.sessions.find(session => session.id === b.session_id)!;
    expect(rowA.chain_id).not.toBe(rowB.chain_id);
    expect(rowB.previous_session_id).toBeNull();
    expect(exported.sessions.find(session => session.id === next.session_id)?.chain_id).toBe(rowA.chain_id);
    validateExport(exported);
  });

  it("does not deduplicate or link across separate studies", async () => {
    const a = await pool(words(2), 2), b = await pool(words(2), 2);
    const ca = credentials(a), cb = credentials(b);
    const first = await start(ca);
    await complete(ca, first);
    expect(await continued(ca)).toEqual({ exhausted: true });
    const second = await start(cb);
    expect(second.items.map(item => item.spelling).sort()).toEqual(first.items.map(item => item.spelling).sort());
    const [ea, eb] = await Promise.all([owner.exportStudy(ca.study_id), owner.exportStudy(cb.study_id)]);
    expect(ea.sessions[0].chain_id).not.toBe(eb.sessions[0].chain_id);
  });
});
