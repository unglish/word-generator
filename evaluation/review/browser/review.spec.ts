import { test, expect } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import { RUBRIC, LEGACY_RUBRIC } from "../protocol.js";
import type { Continuation, Submission } from "../protocol.js";

const spellings = ["blim", "sproke", "thindle", "plond", "frale", "strem", "noffle", "crusp", "trindle", "glave", "prane", "smindle", "glisk", "nust", "twem", "drail", "flemp", "skavel", "swint", "blarn"];
const assignment = { rubric: RUBRIC, items: spellings.map((spelling, position) => ({ position, sample_id: `sample-${position}`, spelling })) };

async function backend(context: BrowserContext) {
  const continuations = new Map<string, Continuation>();
  const state = { loseContinuationAck: false, continuationAttempts: [] as unknown[], continuations, offline: false, loseAck: false, closed: false, permanent: false, starts: 0, attempts: [] as Submission[], received: new Map<string, Submission>() };
  await context.route("https://review.test/rest/v1/rpc/*", async route => {
    const request = route.request();
    if (state.offline) return route.abort("internetdisconnected");
    if (request.url().endsWith("/start_review")) {
      state.starts++;
      return route.fulfill({ status: state.closed ? 404 : 200, json: state.closed ? {} : assignment });
    }
    if (request.url().endsWith("/continue_review")) {
      const body = request.postDataJSON();
      state.continuationAttempts.push(body);
      let result = continuations.get(body.session_id);
      if (!result) {
        result = { exhausted: true };
        if (continuations.size < 2) {
          const items = assignment.items.slice(0, continuations.size ? 2 : 20).map(item => ({
            ...item, sample_id: `${item.sample_id}-${continuations.size}`, spelling: `${item.spelling}${continuations.size ? "ly" : "ish"}`,
          }));
          result = { exhausted: false, session_id: crypto.randomUUID(), submission_token: "b".repeat(64), assignment: { ...assignment, items } };
        }
        continuations.set(body.session_id, result);
      }
      if (state.loseContinuationAck) { state.loseContinuationAck = false; return route.abort("connectionreset"); }
      return route.fulfill({ json: result });
    }
    if (state.permanent) return route.fulfill({ status: 409, json: {} });
    const response = request.postDataJSON() as Submission;
    state.attempts.push(response);
    state.received.set(response.response_id, response);
    if (state.loseAck) { state.loseAck = false; return route.abort("connectionreset"); }
    return route.fulfill({ json: { accepted: true, response_id: response.response_id } });
  });
  return state;
}

async function begin(page: Page) {
  await page.goto("/review.html");
  await page.getByRole("button", { name: "Start reviewing" }).click();
  await expect(page.getByRole("heading", { name: "blim", exact: true })).toBeVisible();
}
async function rate(page: Page, familiar = false) {
  const progress = await page.locator("#progress").textContent();
  await page.getByRole("radio", { name: "Completely", exact: true }).check();
  if (familiar) await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit and next" }).click();
  await page.waitForFunction(previous => document.querySelector("#progress")?.textContent !== previous || !document.querySelector<HTMLElement>("#finished")?.hidden, progress);
}

test("completes a blinded session with familiarity and skips", async ({ page, context }) => {
  const server = await backend(context);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await begin(page);
  await expect(page.getByRole("button", { name: "Submit and next" })).toBeDisabled();
  await rate(page, true);
  await page.getByRole("button", { name: "Skip — I can’t judge this" }).click();
  await expect(page.getByRole("heading", { name: "thindle", exact: true })).toBeVisible();
  for (let i = 2; i < 20; i++) await rate(page);
  await expect(page.getByRole("heading", { name: "Thank you. Your review is submitted." })).toBeVisible();
  expect(server.received.size).toBe(20);
  const responses = [...server.received.values()].sort((a, b) => a.position - b.position);
  expect(responses[0].familiar).toBe(true);
  expect(responses[1]).toMatchObject({ status: "skipped", rating: null, familiar: null });
  expect(responses[2].familiar).toBe(false);
  expect(errors).toEqual([]);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Thank you. Your review is submitted." })).toBeVisible();
  expect(server.starts).toBe(1);
});

test("buffers offline, resumes after reload, and waits for acknowledgement", async ({ page, context }) => {
  const server = await backend(context);
  await begin(page);
  server.offline = true;
  await rate(page);
  await expect(page.getByRole("status")).toContainText("1 response saved on this device");
  await page.reload();
  await expect(page.getByRole("heading", { name: "sproke", exact: true })).toBeVisible();
  for (let i = 1; i < 20; i++) await page.getByRole("button", { name: "Skip — I can’t judge this" }).click();
  await expect(page.getByRole("heading", { name: "All words reviewed. Still sending…" })).toBeVisible();
  expect(server.received.size).toBe(0);
  server.offline = false;
  await page.getByRole("button", { name: "Retry connection" }).click();
  await expect(page.getByRole("heading", { name: "Thank you. Your review is submitted." })).toBeVisible();
  expect(server.received.size).toBe(20);
});

test("retries the identical payload after a lost acknowledgement", async ({ page, context }) => {
  const server = await backend(context);
  await begin(page);
  server.loseAck = true;
  await rate(page);
  await expect.poll(() => server.attempts.length).toBeGreaterThanOrEqual(2);
  expect(server.attempts[0]).toEqual(server.attempts[1]);
  expect(server.received.size).toBe(1);
  await expect(page.getByRole("status")).toHaveText("All submitted responses have been received.");
});

test("two tabs cannot overwrite the same position", async ({ page, context }) => {
  const server = await backend(context);
  await begin(page);
  const other = await context.newPage();
  await other.goto("/review.html");
  await expect(other.getByRole("heading", { name: "blim", exact: true })).toBeVisible();
  await rate(page);
  await other.getByRole("radio", { name: "Not at all", exact: true }).check();
  await other.getByRole("button", { name: "Submit and next" }).click();
  await expect(other.getByRole("heading", { name: "sproke", exact: true })).toBeVisible();
  await expect.poll(() => server.received.size).toBe(1);
  expect([...server.received.values()][0].rating).toBe(5);
});

test("storage failure prevents starting", async ({ page, context }) => {
  const server = await backend(context);
  await page.addInitScript(() => { IDBFactory.prototype.open = () => { throw new DOMException("Storage disabled", "SecurityError"); }; });
  await page.goto("/review.html");
  await expect(page.getByRole("alert")).toContainText("Allow site storage");
  await expect(page.getByRole("button", { name: "Start reviewing" })).toBeDisabled();
  expect(server.starts).toBe(0);
});

test("a failed local enqueue leaves the current word unanswered", async ({ page, context }) => {
  const server = await backend(context);
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, key) {
      if (this.name === "sessions" && value.next === 1 && value.outbox.length === 1) throw new DOMException("Disk full", "QuotaExceededError");
      return put.call(this, value, key);
    };
  });
  await begin(page);
  await page.getByRole("radio", { name: "Completely", exact: true }).check();
  await page.getByRole("button", { name: "Submit and next" }).click();
  await expect(page.getByRole("alert")).toContainText("could not save your progress");
  await expect(page.getByRole("heading", { name: "blim", exact: true })).toBeVisible();
  expect(server.received.size).toBe(0);
});

test("a failed acknowledgement write retains the response for an identical retry", async ({ page, context }) => {
  const server = await backend(context);
  await page.addInitScript(() => {
    Reflect.set(window, "failAcknowledgementWrite", true);
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, key) {
      if (Reflect.get(window, "failAcknowledgementWrite") && this.name === "sessions" && value.next === 1 && value.outbox.length === 0) throw new DOMException("Disk full", "QuotaExceededError");
      return put.call(this, value, key);
    };
  });
  await begin(page);
  await rate(page);
  await expect(page.getByRole("alert")).toContainText("could not save your progress");
  expect(server.received.size).toBe(1);
  // Permit writes before the application's initialization on the next load.
  await page.addInitScript(() => Reflect.set(window, "failAcknowledgementWrite", false));
  await page.reload();
  await expect(page.getByRole("status")).toHaveText("All submitted responses have been received.");
  expect(server.received.size).toBe(1);
  expect(server.attempts[0]).toEqual(server.attempts[1]);
});

test("rapid submit clicks advance only one word", async ({ page, context }) => {
  const server = await backend(context);
  await begin(page);
  await page.getByRole("radio", { name: "Completely", exact: true }).check();
  await page.locator("#submit").evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.getByRole("heading", { name: "sproke", exact: true })).toBeVisible();
  await expect.poll(() => server.received.size).toBe(1);
});

test("long spellings wrap without hiding controls or overflowing the page", async ({ page, context }) => {
  const long = "uncharacteristically".repeat(4);
  await backend(context);
  await context.route("https://review.test/rest/v1/rpc/start_review", route => route.fulfill({ json: {
    ...assignment, items: [{ ...assignment.items[0], spelling: long }, ...assignment.items.slice(1)],
  } }));
  await page.goto("/review.html");
  await page.getByRole("button", { name: "Start reviewing" }).click();
  await expect(page.getByRole("heading", { name: long, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("radio", { name: "Completely", exact: true }).check();
  await expect(page.getByRole("button", { name: "Submit and next" })).toBeEnabled();
});

test("permanent API failures preserve the outbox and pause advancement", async ({ page, context }) => {
  const server = await backend(context);
  await begin(page);
  server.permanent = true;
  await rate(page);
  await expect(page.getByRole("alert")).toContainText("Please contact the study owner");
  await expect(page.getByRole("button", { name: "Skip — I can’t judge this" })).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("1 response saved on this device");
  await expect(page.getByRole("button", { name: "Retry connection" })).toBeHidden();
});

test("a closed study shows a clear unavailable state", async ({ page, context }) => {
  const server = await backend(context);
  server.closed = true;
  await page.goto("/review.html");
  await page.getByRole("button", { name: "Start reviewing" }).click();
  await expect(page.getByRole("alert")).toHaveText("This study is unavailable or closed to new reviews.");
});

test("keyboard controls and responsive light/dark layouts", async ({ page, context }, testInfo) => {
  await backend(context);
  await begin(page);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("radio", { name: "Not at all", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: "A little", exact: true })).toBeChecked();
  await expect(page.getByRole("heading", { name: "blim", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.screenshot({ path: `.impeccable/review/${testInfo.project.name}-${colorScheme}.png`, fullPage: true });
  }
});

test("keeps optional comments through offline reload and clears them for the next word", async ({ page, context }) => {
  const server = await backend(context);
  await begin(page);
  await expect(page.locator("#question")).toHaveText(RUBRIC.question);
  await expect(page.locator("#instruction")).toHaveText(RUBRIC.instruction);
  await page.getByLabel("Comment (optional)").fill("An ending I recognize.\nBut unfamiliar.");
  server.offline = true;
  await rate(page);
  await expect(page.getByLabel("Comment (optional)")).toHaveValue("");
  await page.reload();
  await expect(page.getByRole("heading", { name: "sproke", exact: true })).toBeVisible();
  server.offline = false;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(() => server.received.size).toBe(1);
  expect([...server.received.values()][0].comment).toBe("An ending I recognize.\nBut unfamiliar.");
  await page.getByLabel("Comment (optional)").fill("Cannot decide");
  await page.getByRole("button", { name: "Skip — I can’t judge this" }).click();
  await expect.poll(() => server.received.size).toBe(2);
  expect([...server.received.values()][1].comment).toBe("Cannot decide");
});

test("resumes unfinished v1 reviews using their original scale", async ({ page, context }) => {
  await backend(context);
  await page.goto("/review.html");
  await page.evaluate(async rubric => {
    const request = indexedDB.open("unglish-review-v1", 1);
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("sessions", "readwrite");
        tx.objectStore("sessions").put({ revision: 1, id: crypto.randomUUID(), token: "a".repeat(64), next: 0, outbox: [], assignment: { rubric, items: [{position: 0, sample_id: "old", spelling: "oldword"}] } }, "https://review.test|written-v1-baseline");
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, LEGACY_RUBRIC);
  await page.reload();
  await expect(page.locator("#question")).toHaveText(LEGACY_RUBRIC.question);
  await expect(page.getByLabel("Comment (optional)")).toBeHidden();
  await page.getByRole("radio", { name: "Very plausible", exact: true }).check();
  await page.getByRole("button", { name: "Submit and next" }).click();
  await expect(page.getByRole("link", { name: "Start a review with the updated question" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Start reviewing" }).click();
  await expect(page.locator("#question")).toHaveText(RUBRIC.question);
});

test("continues beyond twenty words with a durable new batch", async ({ page, context }) => {
  const server = await backend(context);
  await begin(page);
  const oldTab = await context.newPage();
  await oldTab.goto("/review.html");
  await expect(oldTab.locator("#word")).toHaveText("blim");
  for (let i = 0; i < 20; i++) await rate(page);
  const more = page.getByRole("button", { name: "Review more words" });
  await expect(more).toBeVisible();
  await expect(more).toBeEnabled();
  await more.dblclick();
  await expect(page.locator("#progress")).toHaveText("Word 1 of 20");
  await expect(page.getByRole("radio", { name: "Completely", exact: true })).not.toBeChecked();
  await page.reload();
  await expect(page.locator("#progress")).toHaveText("Word 1 of 20");
  await oldTab.getByRole("radio", { name: "Not at all", exact: true }).check();
  await oldTab.getByRole("button", { name: "Submit and next" }).click();
  await expect(oldTab.getByRole("alert")).toContainText("already submitted in another tab");
  expect(server.received.size).toBe(20);
  await rate(page);
  await expect.poll(() => server.received.size).toBe(21);
  expect(new Set([...server.received.values()].map(r => r.session_id)).size).toBe(2);
  expect(server.starts).toBe(1);
  expect(server.continuations.size).toBe(1);
  await expect(page.locator("#word")).toHaveText("sprokeish");
});

test("recovers the same continuation after a lost reply and reload, then finishes the partial last batch", async ({ page, context }, testInfo) => {
  const server = await backend(context);
  await begin(page);
  const seen = new Set<string>();
  async function reviewBatch(length: number) {
    for (let i = 0; i < length; i++) {
      await expect(page.locator("#progress")).toHaveText(`Word ${i + 1} of ${length}`);
      const word = (await page.locator("#word").textContent())!;
      expect(seen.has(word)).toBe(false);
      seen.add(word);
      await rate(page);
    }
    await expect(page.locator("#finished-title")).toHaveText("Thank you. Your review is submitted.");
  }
  await reviewBatch(20);
  server.loseContinuationAck = true;
  await page.getByRole("button", { name: "Review more words" }).click();
  await expect(page.getByRole("button", { name: "Retry connection" })).toBeVisible();
  server.offline = true;
  await page.reload();
  await expect(page.getByRole("button", { name: "Retry connection" })).toBeVisible();
  await expect(page.locator("#finished-title")).toHaveText("Preparing your next words…");
  server.offline = false;
  await page.getByRole("button", { name: "Retry connection" }).click();
  await reviewBatch(20);
  expect(server.continuationAttempts).toHaveLength(2);
  expect(server.continuationAttempts[0]).toEqual(server.continuationAttempts[1]);
  expect(server.continuations.size).toBe(1);
  await page.getByRole("button", { name: "Review more words" }).click();
  await expect(page.locator("#progress")).toHaveText("Word 1 of 2");
  await page.screenshot({ path: `.impeccable/review/${testInfo.project.name}-partial.png`, fullPage: true });
  await reviewBatch(2);
  await page.getByRole("button", { name: "Review more words" }).click();
  await expect(page.locator("#finished-title")).toHaveText("Thank you. You’ve reviewed every spelling in this study.");
  await expect(page.getByRole("button", { name: "Review more words" })).toBeHidden();
  await expect(page.locator("#finished-copy")).toContainText("no unseen words left");
  await page.screenshot({ path: `.impeccable/review/${testInfo.project.name}-exhausted.png`, fullPage: true });
  expect(server.received.size).toBe(42);
  const attempts = server.continuationAttempts.length;
  await page.reload();
  await expect(page.locator("#finished-title")).toHaveText("Thank you. You’ve reviewed every spelling in this study.");
  expect(server.continuationAttempts).toHaveLength(attempts);
});

test("competing completed tabs continue once and recover after a failed local continuation write", async ({ page, context }) => {
  const server = await backend(context);
  await begin(page);
  for (let i = 0; i < 20; i++) await rate(page);
  await expect(page.getByRole("button", { name: "Review more words" })).toBeVisible();
  const other = await context.newPage();
  await other.goto("/review.html");
  await expect(other.getByRole("button", { name: "Review more words" })).toBeVisible();
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, key) {
      if (this.name === "sessions" && value.next === 0 && value.assignment) throw new DOMException("Disk full", "QuotaExceededError");
      return put.call(this, value, key);
    };
  });
  await page.getByRole("button", { name: "Review more words" }).click();
  await expect(page.getByRole("alert")).toContainText("could not save your progress");
  await other.getByRole("button", { name: "Review more words" }).click();
  await expect(other.locator("#word")).toHaveText("blimish");
  await rate(other);
  await page.reload();
  await expect(page.locator("#word")).toHaveText("sprokeish");
  expect(server.continuations.size).toBe(1);
  expect(server.received.size).toBe(21);
});

test("keeps continuation authorization after an invalid acknowledgement", async ({ page, context }) => {
  const server = await backend(context);
  await begin(page);
  for (let i = 0; i < 20; i++) await rate(page);
  await context.route("https://review.test/rest/v1/rpc/continue_review", route => route.fulfill({ json: { exhausted: false } }), { times: 1 });
  await page.getByRole("button", { name: "Review more words" }).click();
  await expect(page.getByRole("alert")).toContainText("invalid continuation");
  await page.getByRole("button", { name: "Retry connection" }).click();
  await expect(page.locator("#word")).toHaveText("blimish");
  expect(server.received.size).toBe(20);
  expect(server.continuations.size).toBe(1);
});

for (const resumeEvent of ["visibilitychange", "online"] as const) {
  test(`an existing tab takes over a pending continuation on ${resumeEvent}`, async ({ page, context }) => {
    const server = await backend(context);
    await begin(page);
    for (let i = 0; i < 20; i++) await rate(page);
    await expect(page.getByRole("button", { name: "Review more words" })).toBeVisible();
    const other = await context.newPage();
    await other.goto("/review.html");
    await expect(other.getByRole("button", { name: "Review more words" })).toBeVisible();
    await other.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    });

    server.loseContinuationAck = true;
    await page.getByRole("button", { name: "Review more words" }).click();
    await expect(page.getByRole("button", { name: "Retry connection" })).toBeVisible();
    await page.close();

    await other.evaluate(event => {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
      const target = event === "visibilitychange" ? document : window;
      target.dispatchEvent(new Event(event));
    }, resumeEvent);
    await expect(other.locator("#word")).toHaveText("blimish");
    await expect(other.locator("#progress")).toHaveText("Word 1 of 20");
    expect(server.continuations.size).toBe(1);
    expect(server.continuationAttempts).toHaveLength(2);
    expect(server.continuationAttempts[1]).toEqual(server.continuationAttempts[0]);
    await rate(other);
    await expect.poll(() => server.received.size).toBe(21);
  });
}
