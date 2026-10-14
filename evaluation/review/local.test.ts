import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ReviewStore, StalePositionError } from "../../demo/review/local.js";
import { RUBRIC, parseAssignment, parseContinuation, validAnswer } from "./protocol.js";

let store: ReviewStore;
beforeEach(async () => { store = await ReviewStore.open(); });
afterEach(() => store.close());
const assignment = { rubric: RUBRIC, items: [{ position: 0, sample_id: "a", spelling: "blim" }, { position: 1, sample_id: "b", spelling: "sproke" }] };

describe("durable one-way session", () => {
  it("persists credentials before assignment and preserves them across competing tabs", async () => {
    const key = crypto.randomUUID();
    const [a, b] = await Promise.all([store.ensure(key), store.ensure(key)]);
    expect(a).toEqual(b);
    expect(a.token).toMatch(/^[0-9a-f]{64}$/);
    expect((await store.get(key))?.assignment).toBeNull();
  });
  it("atomically queues before advancing, rejects stale writes, and survives reopen", async () => {
    const key = crypto.randomUUID();
    await store.ensure(key);
    await store.assign(key, assignment);
    const attempts = await Promise.allSettled([
      store.enqueue(key, 0, { status: "rated", rating: 5, familiar: false, comment: "Looks familiar\nA second thought" }),
      store.enqueue(key, 0, { status: "rated", rating: 1, familiar: true }),
    ]);
    expect(attempts.filter(attempt => attempt.status === "fulfilled")).toHaveLength(1);
    const failed = attempts.find(attempt => attempt.status === "rejected") as PromiseRejectedResult;
    expect(failed.reason).toBeInstanceOf(StalePositionError);
    store.close();
    store = await ReviewStore.open();
    const saved = (await store.get(key))!;
    expect(saved.next).toBe(1);
    expect(saved.outbox).toHaveLength(1);
    const response = saved.outbox[0];
    expect(response.comment).toBe("Looks familiar\nA second thought");
    expect((await store.get(key))!.outbox[0]).toEqual(response);
    await store.acknowledge(key, response.response_id);
    const acknowledged = await store.acknowledge(key, response.response_id);
    expect(acknowledged.outbox).toEqual([]);
    expect(acknowledged.next).toBe(1);
  });
  it("does not advance when local writes abort", async () => {
    const key = crypto.randomUUID();
    await store.ensure(key);
    await store.assign(key, assignment);
    await expect(store.enqueue(key, 0, { status: "rated", rating: 6, familiar: false })).rejects.toThrow();
    expect((await store.get(key))?.next).toBe(0);
  });
});

it("distinguishes skipping from a midpoint rating and rejects altered scales", () => {
  expect(validAnswer({ status: "skipped", rating: 3, familiar: null })).toBe(false);
  expect(validAnswer({ status: "rated", rating: 3, familiar: false })).toBe(true);
  expect(() => parseAssignment({ ...assignment, rubric: { ...RUBRIC, labels: ["good", "bad"] } })).toThrow();
  expect(() => parseAssignment({ ...assignment, items: [assignment.items[0], { ...assignment.items[0], position: 1 }] })).toThrow();
});

it("limits optional comments without changing legacy answers", () => {
  expect(validAnswer({ status: "skipped", rating: null, familiar: null, comment: "A thought" })).toBe(true);
  expect(validAnswer({ status: "rated", rating: 4, familiar: false, comment: "x".repeat(2001) })).toBe(false);
});

it("starts only one next batch and never discards pending responses", async () => {
  const key = crypto.randomUUID();
  const first = await store.ensure(key);
  await store.assign(key, assignment);
  await expect(store.nextBatch(key, first.id)).rejects.toThrow();
  await store.enqueue(key, 0, {status: "rated", rating: 3, familiar: false});
  const done = await store.enqueue(key, 1, {status: "skipped", rating: null, familiar: null});
  await expect(store.nextBatch(key, first.id)).rejects.toThrow();
  for (const response of done.outbox) await store.acknowledge(key, response.response_id);
  const [a, b] = await Promise.all([store.nextBatch(key, first.id), store.nextBatch(key, first.id)]);
  expect(a).toEqual(b);
  expect(a.id).toBe(first.id);
  expect(a.token).toBe(first.token);
  expect(a.continuing).toBe(true);
  expect(a.assignment).toEqual(assignment);
  expect(a.next).toBe(2);
  expect(a.revision).toBeGreaterThan(done.revision);
  store.close();
  store = await ReviewStore.open();
  expect(await store.get(key)).toEqual(a);
  const result = { exhausted: false as const, session_id: crypto.randomUUID(), submission_token: "b".repeat(64), assignment };
  const [next, retry] = await Promise.all([store.continued(key, first.id, result), store.continued(key, first.id, result)]);
  expect(next).toEqual(retry);
  expect(next.id).toBe(result.session_id);
  expect(next.token).toBe(result.submission_token);
  expect(next.next).toBe(0);
  expect(next.continuing).toBeUndefined();
  expect(await store.assign(key, { ...assignment, items: [assignment.items[0]] }, first.id)).toEqual(next);
  await expect(store.enqueue(key, 0, { status: "rated", rating: 1, familiar: false }, first.id)).rejects.toBeInstanceOf(StalePositionError);
  expect((await store.get(key))?.next).toBe(0);
  const advanced = await store.enqueue(key, 0, { status: "rated", rating: 4, familiar: false }, next.id);
  expect(await store.continued(key, first.id, result)).toEqual(advanced);
});

it("persists exhaustion and never starts another batch after reload", async () => {
  const key = crypto.randomUUID();
  const first = await store.ensure(key);
  await store.assign(key, { ...assignment, items: [assignment.items[0]] });
  const done = await store.enqueue(key, 0, { status: "skipped", rating: null, familiar: null });
  await store.acknowledge(key, done.outbox[0].response_id);
  await store.nextBatch(key, first.id);
  const exhausted = await store.continued(key, first.id, { exhausted: true });
  expect(exhausted).toMatchObject({ exhausted: true, continuing: false, next: 1, outbox: [] });
  store.close();
  store = await ReviewStore.open();
  expect(await store.nextBatch(key, first.id)).toEqual(exhausted);
});

it("validates continuation acknowledgements and partial assignments", () => {
  expect(parseContinuation({ exhausted: true })).toEqual({ exhausted: true });
  const result = { exhausted: false, session_id: crypto.randomUUID(), submission_token: "a".repeat(64), assignment: { ...assignment, items: [assignment.items[0]] } };
  expect(parseContinuation(result)).toEqual(result);
  for (const changed of [{ exhausted: undefined }, { session_id: "bad" }, { submission_token: "bad" }, { assignment: { ...assignment, items: [] } }]) {
    expect(() => parseContinuation({ ...result, ...changed })).toThrow();
  }
});
