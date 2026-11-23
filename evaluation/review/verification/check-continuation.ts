import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import {
  latestSession,
  pendingReviewRequest,
  ReviewStore,
  StalePositionError,
} from "../../../demo/review/local.js";
import type {
  LocalSession,
  ReviewReceipt,
} from "../../../demo/review/local.js";
import { RUBRIC } from "../protocol.js";
import type { Answer, Assignment, Submission } from "../protocol.js";

type Batch = 0 | 1;
type Phase =
  | "unassigned"
  | "answering"
  | "queued"
  | "complete"
  | "continuing"
  | "exhausted";
interface State {
  batch: Batch;
  phase: Phase;
  received: 0 | 1 | 2;
}

type Action =
  | "assignment reply"
  | "answer"
  | "server commits"
  | "response reply"
  | "request next batch"
  | "continuation reply"
  | "reload";
interface Step {
  action: Action;
  batch: Batch;
  after: State;
  rejected?: "stale answer" | "unfinished batch";
}

const initial: State = { batch: 0, phase: "unassigned", received: 0 };

function successors(state: State): Step[] {
  const { batch, phase, received } = state;
  const steps: Step[] = [
    {
      action: "assignment reply",
      batch: 0,
      after: phase === "unassigned" ? { ...state, phase: "answering" } : state,
    },
    { action: "reload", batch, after: state },
  ];
  if (phase === "queued") {
    steps.push({
      action: "server commits",
      batch,
      after: { ...state, received: batch === 0 ? 1 : 2 },
    });
  }
  for (const known of [0, 1] as const) {
    if (known > batch) continue;
    const current = known === batch;
    if (phase !== "unassigned") {
      const canAnswer = current && phase === "answering";
      steps.push({
        action: "answer",
        batch: known,
        after: canAnswer ? { ...state, phase: "queued" } : state,
        rejected: canAnswer ? undefined : "stale answer",
      });
    }
    const finished = current && phase === "complete";
    const unfinished =
      current &&
      (phase === "unassigned" || phase === "answering" || phase === "queued");
    steps.push({
      action: "request next batch",
      batch: known,
      after: finished ? { ...state, phase: "continuing" } : state,
      rejected: unfinished ? "unfinished batch" : undefined,
    });
    if (received > known) {
      steps.push({
        action: "response reply",
        batch: known,
        after:
          current && phase === "queued"
            ? { ...state, phase: "complete" }
            : state,
      });
    }
    if (!current || phase === "continuing" || phase === "exhausted") {
      let after = state;
      if (current && phase === "continuing") {
        after =
          known === 0
            ? { batch: 1, phase: "answering", received }
            : { ...state, phase: "exhausted" };
      }
      steps.push({ action: "continuation reply", batch: known, after });
    }
  }
  return steps;
}

function assignment(spelling: string): Assignment {
  return {
    rubric: RUBRIC,
    items: [{ position: 0, sample_id: `sample-${spelling}`, spelling }],
  };
}

const assignments = [assignment("blim"), assignment("sproke")] as const;
const nextId = "00000000-0000-4000-8000-000000000002";
const nextToken = "b".repeat(64);
const answer: Answer = {
  status: "rated",
  rating: 4,
  familiar: false,
  comment: "Saved before advancing",
};

function continuation(batch: Batch, sessionId: string): ReviewReceipt {
  return {
    kind: "continue",
    sessionId,
    result:
      batch === 0
        ? {
          exhausted: false,
          session_id: nextId,
          submission_token: nextToken,
          assignment: assignments[1],
        }
        : { exhausted: true },
  };
}

async function replay(path: readonly Step[]): Promise<void> {
  const key = crypto.randomUUID();
  let firstTab = await ReviewStore.open();
  const secondTab = await ReviewStore.open();
  try {
    const first = await firstTab.ensure(key);
    const ids = [first.id, nextId];
    const tokens = [first.token, nextToken];
    const queued: Partial<Record<Batch, Submission>> = {};
    const sent: Partial<Record<Batch, Submission>> = {};
    let earlier = first;

    function compare(local: LocalSession, expected: State): void {
      const { batch, phase } = expected;
      assert.equal(
        local.id,
        ids[batch],
        "Continuing must retain the completed batch identity until its reply arrives",
      );
      assert.equal(local.token, tokens[batch]);
      assert.deepEqual(
        local.assignment,
        phase === "unassigned" ? null : assignments[batch],
      );
      assert.equal(
        local.next,
        phase === "unassigned" || phase === "answering" ? 0 : 1,
      );
      const response = queued[batch];
      if (phase === "queued") {
        assert(response);
        assert.deepEqual(local.outbox, [response]);
      } else {
        assert.deepEqual(local.outbox, []);
      }
      assert.equal(local.exhausted === true, phase === "exhausted");
      const kind =
        phase === "unassigned"
          ? "start"
          : phase === "continuing"
            ? "continue"
            : undefined;
      assert.deepEqual(
        pendingReviewRequest(local),
        kind ? { kind, id: ids[batch], token: tokens[batch] } : undefined,
      );
    }

    compare(first, initial);
    for (const [index, step] of path.entries()) {
      const { action, batch, after, rejected } = step;
      const sessionId = ids[batch];
      try {
        switch (action) {
        case "assignment reply":
          await secondTab.receive(key, {
            kind: "start",
            sessionId,
            assignment: assignments[0],
          });
          break;
        case "answer": {
          const attempt = firstTab.enqueue(
            key,
            { sessionId, position: 0 },
            answer,
          );
          if (rejected) {
            await assert.rejects(attempt, StalePositionError);
          } else {
            const submitted = await attempt;
            const [response] = submitted.outbox;
            assert(response);
            assert.deepEqual(response, {
              session_id: sessionId,
              submission_token: tokens[batch],
              response_id: response.response_id,
              position: 0,
              ...answer,
            });
            assert.match(response.response_id, /^[0-9a-f-]{36}$/);
            if (batch === 1)
              assert.notEqual(response.response_id, queued[0]?.response_id);
            queued[batch] = response;
          }
          break;
        }
        case "server commits": {
          const response = (await secondTab.get(key))?.outbox[0];
          assert(response);
          if (sent[batch]) assert.deepEqual(response, sent[batch]);
          sent[batch] = response;
          break;
        }
        case "response reply": {
          const receipt = sent[batch];
          assert(receipt);
          await secondTab.acknowledge(key, receipt.response_id);
          break;
        }
        case "request next batch": {
          const attempt = firstTab.nextBatch(key, sessionId);
          if (rejected)
            await assert.rejects(
              attempt,
              /Wait until all responses are received/,
            );
          else await attempt;
          break;
        }
        case "continuation reply":
          await secondTab.receive(key, continuation(batch, sessionId));
          break;
        case "reload":
          firstTab.close();
          firstTab = await ReviewStore.open();
          break;
        }
        const local = await firstTab.get(key);
        assert(local);
        compare(local, after);
        assert.deepEqual(
          latestSession(local, earlier),
          local,
          "An earlier snapshot must not rewind the rendered session",
        );
        earlier = local;
      } catch (error) {
        const history = path
          .slice(0, index + 1)
          .map((step) => `${step.action} [batch ${step.batch + 1}]`)
          .join(" → ");
        throw new Error(`Review continuation counterexample: ${history}`, {
          cause: error,
        });
      }
    }
  } finally {
    firstTab.close();
    secondTab.close();
  }
}

async function check(): Promise<void> {
  const queue: { state: State; path: Step[] }[] = [
    { state: initial, path: [] },
  ];
  const reachable = new Set([JSON.stringify(initial)]);
  let edges = 0;
  for (const { state, path } of queue) {
    for (const step of successors(state)) {
      const trace = [...path, step];
      await replay(trace);
      edges++;
      const key = JSON.stringify(step.after);
      if (reachable.has(key)) continue;
      reachable.add(key);
      queue.push({ state: step.after, path: trace });
    }
  }
  console.log(
    `Review continuation verified: ${reachable.size} states, ${edges} transitions.`,
  );
}

await check();
