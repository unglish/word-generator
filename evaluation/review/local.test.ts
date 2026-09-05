import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ReviewStore, StalePositionError } from "../../demo/review/local.js";
import { RUBRIC, parseAssignment, validAnswer } from "./protocol.js";

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
