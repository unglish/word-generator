import { mkdtemp, readFile, rm, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { fixtureSnapshot } from "../../fixtures.js";
import { digest } from "../../snapshot.js";
import { allocateComparison } from "../comparison-allocation.js";
import { freezeComparison } from "../comparison-freeze.js";
import { buildComparisonReport } from "../comparison-report.js";
import { authorizeOwner, authorizeParticipant, createCollector, eventForSubmission, nextAssignment, parseSubmission, restoreCollector, validateCollector } from "./collection-core.js";
import { CollectorJournal, initializeCollector, parseJournal } from "./collection-journal.js";
import { createCollectorServer } from "./collection-server.js";
import type { CollectorState, CollectorSubmission } from "./collection-model.js";
import type { Server } from "node:http";

function fixture() {
  const comparison = freezeComparison({ version: "written-comparison-v1", study_id: "collector-fixture", purpose: "development-fixture",
    candidate_selection: "Synthetic collection validation only.", population: "Zero real participants.", assignment_seed: 42,
    pairs_per_stratum: 2, session_length: 2, participant_slots: ["p0", "p1", "p2", "p3"],
    strata: [{ id: "all", lengths: [1, 100], syllables: [1, 10], morphology: ["bare", "prefixed", "suffixed", "prefixed-and-suffixed", "applied-unspecified"] }] }, {
    baseline: fixtureSnapshot("collector-base", ["same", "basea", "baseb", "basec", "basec"]),
    candidate: fixtureSnapshot("collector-candidate", ["same", "canda", "candb", "candc"]),
  });
  return createCollector(comparison, allocateComparison(comparison), null, "2026-10-03T00:00:00.000Z");
}
function current(state: CollectorState, participant = "p0"): CollectorSubmission {
  const next = nextAssignment(state, participant);
  if (next.exhausted) throw new Error("Fixture exhausted.");
  return { session_id: next.packet.session_id, position: next.position, answer: { status: "rated", rating: 4, familiar: false } };
}
const directories: string[] = [], journals: CollectorJournal[] = [], servers: Server[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) await new Promise<void>((accept, reject) => server.close(error => error ? reject(error) : accept()));
  for (const journal of journals.splice(0)) await journal.close();
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});
async function storage() {
  const parent = await mkdtemp(join(tmpdir(), "q21-collector-")); directories.push(parent);
  const directory = join(parent, "collection"), created = fixture();
  await initializeCollector(directory, created.manifest, created.credentials);
  const journal = await CollectorJournal.openWriter(directory); journals.push(journal);
  return { directory, journal, ...created };
}

describe("frozen comparison collection protocol", () => {
  it("binds distinct credentials to every planned slot and separates owner access", () => {
    const { manifest, credentials } = fixture(); validateCollector(manifest);
    expect(credentials.participants).toHaveLength(4);
    for (const entry of credentials.participants) expect(authorizeParticipant(manifest, entry.token)).toBe(entry.participant_slot);
    authorizeOwner(manifest, credentials.owner_token);
    expect(() => authorizeParticipant(manifest, credentials.owner_token)).toThrow();
    expect(() => authorizeOwner(manifest, credentials.participants[0].token)).toThrow();
    expect(() => authorizeParticipant(manifest, "0".repeat(64))).toThrow();
    const changed = structuredClone(manifest); changed.participant_credentials[1] = changed.participant_credentials[0];
    expect(() => validateCollector(changed)).toThrow();
  });
  it("retains planned order, blinding, skips and resumable multi-session progress", () => {
    const { manifest } = fixture(); let state = restoreCollector(manifest, []);
    const initial = nextAssignment(state, "p0"); expect(initial.exhausted).toBe(false);
    if (initial.exhausted) throw new Error("Fixture exhausted.");
    expect(Object.keys(initial.packet)).toEqual(["session_id", "assignment"]);
    expect(Object.keys(initial.packet.assignment.items[0])).toEqual(["position", "sample_id", "spelling"]);
    const events = [];
    for (let i = 0; i < 4; i++) {
      const submission = current(state); if (i === 1) submission.answer = { status: "skipped", rating: null, familiar: null };
      const event = eventForSubmission(state, "p0", submission, "2026-10-03T01:00:00.000Z")!; events.push(event);
      state = restoreCollector(manifest, events);
    }
    expect(nextAssignment(state, "p0")).toEqual({ exhausted: true });
    expect(nextAssignment(state, "p1").exhausted).toBe(false);
    const report = buildComparisonReport(state.data);
    expect(report.groups.filter(group => group.stratum === null).reduce((sum, group) => sum + group.skipped, 0)).toBe(1);
    expect(report.purpose).toBe("development-fixture");
  });
  it("rejects another participant's assignment, skipped positions, changed retries and malformed answers", () => {
    const { manifest } = fixture(), state = restoreCollector(manifest, []), first = current(state);
    expect(() => eventForSubmission(state, "p1", first, "2026-10-03T01:00:00.000Z")).toThrow("belong");
    expect(() => eventForSubmission(state, "p0", { ...first, position: 1 }, "2026-10-03T01:00:00.000Z")).toThrow("current word");
    for (const value of [null, { ...first, position: -1 }, { ...first, answer: { status: "rated", rating: 6, familiar: false } },
      { ...first, condition: "baseline" }, { ...first, answer: { status: "skipped", rating: 1, familiar: false } }]) expect(() => parseSubmission(value)).toThrow();
    const event = eventForSubmission(state, "p0", first, "2026-10-03T01:00:00.000Z")!;
    const restored = restoreCollector(manifest, [event]);
    expect(eventForSubmission(restored, "p0", first, "2026-10-03T02:00:00.000Z")).toBeNull();
    expect(() => eventForSubmission(restored, "p0", { ...first, answer: { status: "rated", rating: 1, familiar: false } }, "2026-10-03T02:00:00.000Z")).toThrow("already saved");
  });
  it("rejects interrupted, reordered, duplicated and resealed modified receipt chains", () => {
    const { manifest } = fixture(); let state = restoreCollector(manifest, []);
    const first = eventForSubmission(state, "p0", current(state), "2026-10-03T01:00:00.000Z")!;
    state = restoreCollector(manifest, [first]);
    const second = eventForSubmission(state, "p0", current(state), "2026-10-03T01:01:00.000Z")!;
    expect(() => restoreCollector(manifest, [second, first])).toThrow(); expect(() => restoreCollector(manifest, [first, first])).toThrow();
    const changed = structuredClone(first); changed.response.item_id = "foreign";
    const { sha256: unused, ...content } = changed; expect(unused).toBe(first.sha256); changed.sha256 = digest(content);
    expect(() => restoreCollector(manifest, [changed])).toThrow();
    expect(() => parseJournal(JSON.stringify(first))).toThrow("Interrupted");
  });
});

describe("durable single-writer response journal", () => {
  it("acknowledges one durable record for concurrent identical retries and reloads it after restart", async () => {
    const { directory, journal } = await storage();
    const submission = current(journal.snapshot());
    const results = await Promise.all([journal.submit("p0", submission), journal.submit("p0", submission)]);
    expect(results.map(value => value.duplicate)).toEqual([false, true]);
    expect(parseJournal(await readFile(join(directory, "responses.jsonl"), "utf8"))).toHaveLength(1);
    await journal.close();
    const reopened = await CollectorJournal.openWriter(directory); journals.push(reopened);
    expect(reopened.snapshot().data.responses).toEqual(journal.snapshot().data.responses);
    expect(await reopened.submit("p0", submission)).toEqual({ saved: true, duplicate: true });
  });
  it("refuses a second writer, uses private modes and fails rather than overwriting an existing collection", async () => {
    const { directory, journal, manifest, credentials } = await storage();
    await expect(CollectorJournal.openWriter(directory)).rejects.toMatchObject({ code: "EEXIST" });
    expect((await stat(directory)).mode & 0o777).toBe(0o700);
    for (const file of ["manifest.json", "credentials.json", "responses.jsonl", "writer.lock"]) expect((await stat(join(directory, file))).mode & 0o777).toBe(0o600);
    await expect(initializeCollector(directory, manifest, credentials)).rejects.toMatchObject({ code: "EEXIST" });
    expect(journal.snapshot().data.responses).toHaveLength(0);
  });
  it("does not recreate a removed journal or acknowledge a failed write, and refuses further writes", async () => {
    const { directory, journal } = await storage(); const submission = current(journal.snapshot());
    await unlink(join(directory, "responses.jsonl"));
    await expect(journal.submit("p0", submission)).rejects.toMatchObject({ code: "ENOENT" });
    expect(journal.snapshot().data.responses).toHaveLength(0);
    await expect(journal.submit("p0", submission)).rejects.toThrow("recovery");
    await writeFile(join(directory, "responses.jsonl"), "partial", { mode: 0o600 });
    await journal.close(); await expect(CollectorJournal.openWriter(directory)).rejects.toThrow("Interrupted");
  });
});

describe("authenticated loopback collection routes", () => {
  it("exposes only blinded packets to participants, saves submissions, protects owner export and rejects foreign sessions", async () => {
    const { journal, credentials } = await storage(); const server = createCollectorServer(journal); servers.push(server);
    await new Promise<void>(accept => server.listen(0, "127.0.0.1", accept));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("No loopback address.");
    const base = `http://127.0.0.1:${address.port}`, token = credentials.participants[0].token;
    const auth = { Authorization: `Bearer ${token}` };
    const page = await fetch(base); expect(page.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(await page.text()).not.toContain(credentials.owner_token);
    expect((await fetch(base + "/api/next")).status).toBe(401);
    const assignment = await (await fetch(base + "/api/next", { headers: auth })).json();
    expect(Object.keys(assignment.packet)).toEqual(["session_id", "assignment"]);
    expect(JSON.stringify(assignment)).not.toContain("participant_slot"); expect(JSON.stringify(assignment)).not.toContain("baseline");
    expect((await fetch(base + "/api/export", { headers: auth })).status).toBe(401);
    const body = { session_id: assignment.packet.session_id, position: assignment.position, answer: { status: "rated", rating: 5, familiar: false } };
    const saved = await fetch(base + "/api/answer", { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    expect(saved.status).toBe(200); expect(await saved.json()).toEqual({ saved: true, duplicate: false });
    const foreign = await fetch(base + "/api/answer", { method: "POST", headers: { Authorization: `Bearer ${credentials.participants[1].token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    expect(foreign.status).toBe(403);
    const exported = await (await fetch(base + "/api/export", { headers: { Authorization: `Bearer ${credentials.owner_token}` } })).json();
    expect(exported.responses).toHaveLength(1); expect(exported.responses[0].item_id).toBe(assignment.packet.assignment.items[0].sample_id);
    expect(exported.comparison.registration.purpose).toBe("development-fixture");
  });
});
