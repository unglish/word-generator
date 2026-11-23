import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ReviewStore } from "../../demo/review/local.js";
import type { Assignment } from "./protocol.js";
import {
  RUBRIC,
  parseAssignment,
  parseContinuation,
  validAnswer,
} from "./protocol.js";

let store: ReviewStore;
beforeEach(async () => {
  store = await ReviewStore.open();
});
afterEach(() => store.close());
const assignment = {
  rubric: RUBRIC,
  items: [
    { position: 0, sample_id: "a", spelling: "blim" },
    { position: 1, sample_id: "b", spelling: "sproke" },
  ],
};

async function assign(key: string, payload: Assignment = assignment) {
  const { id } = await store.ensure(key);
  return store.receive(key, {
    kind: "start",
    sessionId: id,
    assignment: payload,
  });
}

describe("durable one-way session", () => {
  it("persists credentials before assignment and preserves them across competing tabs", async () => {
    const key = crypto.randomUUID();
    const [a, b] = await Promise.all([store.ensure(key), store.ensure(key)]);
    expect(a).toEqual(b);
    expect(a.token).toMatch(/^[0-9a-f]{64}$/);
    expect((await store.get(key))?.assignment).toBeNull();
  });
  it("rejects an invalid answer without advancing", async () => {
    const key = crypto.randomUUID();
    const session = await assign(key);
    await expect(
      store.enqueue(
        key,
        { sessionId: session.id, position: 0 },
        { status: "rated", rating: 6, familiar: false },
      ),
    ).rejects.toThrow();
    expect((await store.get(key))?.next).toBe(0);
  });
  it("rolls back an updated session when IndexedDB cannot clone the queued answer", async () => {
    const key = crypto.randomUUID();
    const session = await assign(key);
    const before = await store.get(key);
    const answer = {
      status: "rated" as const,
      rating: 4,
      familiar: false,
      uncloneable: () => undefined,
    };
    expect(validAnswer(answer)).toBe(true);
    await expect(
      store.enqueue(key, { sessionId: session.id, position: 0 }, answer),
    ).rejects.toThrow();
    expect(await store.get(key)).toEqual(before);
    store.close();
    store = await ReviewStore.open();
    expect(await store.get(key)).toEqual(before);
  });
});

it("distinguishes skipping from a midpoint rating and rejects altered scales", () => {
  expect(validAnswer({ status: "skipped", rating: 3, familiar: null })).toBe(
    false,
  );
  expect(validAnswer({ status: "rated", rating: 3, familiar: false })).toBe(
    true,
  );
  expect(() =>
    parseAssignment({
      ...assignment,
      rubric: { ...RUBRIC, labels: ["good", "bad"] },
    }),
  ).toThrow();
  expect(() =>
    parseAssignment({
      ...assignment,
      items: [assignment.items[0], { ...assignment.items[0], position: 1 }],
    }),
  ).toThrow();
});

it("limits optional comments without changing legacy answers", () => {
  expect(
    validAnswer({
      status: "skipped",
      rating: null,
      familiar: null,
      comment: "A thought",
    }),
  ).toBe(true);
  expect(
    validAnswer({
      status: "rated",
      rating: 4,
      familiar: false,
      comment: "x".repeat(2001),
    }),
  ).toBe(false);
});

it("validates continuation acknowledgements and partial assignments", () => {
  expect(parseContinuation({ exhausted: true })).toEqual({ exhausted: true });
  const result = {
    exhausted: false,
    session_id: crypto.randomUUID(),
    submission_token: "a".repeat(64),
    assignment: { ...assignment, items: [assignment.items[0]] },
  };
  expect(parseContinuation(result)).toEqual(result);
  for (const changed of [
    { exhausted: undefined },
    { session_id: "bad" },
    { submission_token: "bad" },
    { assignment: { ...assignment, items: [] } },
  ]) {
    expect(() => parseContinuation({ ...result, ...changed })).toThrow();
  }
});

it("retains extra assignment fields in saved sessions", async () => {
  const payload = {
    extra: "kept",
    items: [{ spelling: "blim", sample_id: "a", position: 0, extra: true }],
    rubric: { ...RUBRIC, extra: true },
  };
  const serialized = JSON.stringify(payload);
  expect(JSON.stringify(parseAssignment(payload))).toBe(serialized);
  const key = crypto.randomUUID();
  await assign(key, parseAssignment(JSON.parse(serialized)));
  store.close();
  store = await ReviewStore.open();
  expect((await store.get(key))?.assignment).toEqual(payload);
});

it("rejects non-object answers at the payload boundary", () => {
  for (const value of [null, undefined, false, 3, "rated", [], {}]) {
    expect(validAnswer(value)).toBe(false);
  }
});

it("preserves missing-session errors for each operation", async () => {
  const key = crypto.randomUUID();
  const sessionId = "missing";
  expect(await store.get(key)).toBeUndefined();
  await expect(
    store.enqueue(
      key,
      { sessionId, position: 0 },
      { status: "skipped", rating: null, familiar: null },
    ),
  ).rejects.toThrow("The assignment is missing.");
  for (const mutation of [
    () => store.receive(key, { kind: "start", sessionId, assignment }),
    () => store.nextBatch(key, sessionId),
    () =>
      store.receive(key, {
        kind: "continue",
        sessionId,
        result: { exhausted: true },
      }),
    () => store.acknowledge(key, "missing"),
  ]) {
    await expect(mutation()).rejects.toThrow("Local session is missing.");
  }
  expect(await store.get(key)).toBeUndefined();
});
