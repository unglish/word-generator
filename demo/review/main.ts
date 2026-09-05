import { RUBRIC } from "../../evaluation/review/protocol.js";
import type { Answer } from "../../evaluation/review/protocol.js";
import { ApiError, ReviewApi } from "./api.js";
import { ReviewStore, StalePositionError } from "./local.js";
import type { LocalSession } from "./local.js";

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing review element: ${id}`);
  return node as T;
}
const start = element<HTMLButtonElement>("start");
const submit = element<HTMLButtonElement>("submit");
const skip = element<HTMLButtonElement>("skip");
const retry = element<HTMLButtonElement>("retry");
const form = element<HTMLFormElement>("rating-form");
const status = element("status");
const error = element("error");
const url = import.meta.env.VITE_REVIEW_SUPABASE_URL ?? "";
const publishableKey = import.meta.env.VITE_REVIEW_SUPABASE_PUBLISHABLE_KEY ?? "";
const study = import.meta.env.VITE_REVIEW_STUDY_ID ?? "";
const key = `${url}|${study}`;
const api = new ReviewApi(url, publishableKey, study);
let store: ReviewStore;
let ready = false;
let session: LocalSession | undefined;
let renderedPosition = -1;
let starting = false, saving = false, flushing = false, storageFailed = false, permanentFailure = false;
let retryCount = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

for (const [index, text] of RUBRIC.labels.entries()) {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "radio";
  input.name = "rating";
  input.value = String(index + 1);
  input.required = true;
  label.append(input, document.createTextNode(text));
  element("rating-options").append(label);
}

function showError(message: string): void {
  error.textContent = message;
  error.hidden = !message;
}

function updateControls(): void {
  element<HTMLFieldSetElement>("rating-fieldset").disabled = saving || storageFailed || permanentFailure;
  submit.disabled = saving || storageFailed || permanentFailure || !form.querySelector("input[name=rating]:checked");
  skip.disabled = saving || storageFailed || permanentFailure;
}

function acceptSession(next: LocalSession | undefined): void {
  // A delayed acknowledgement must never move the UI behind a newer local submission.
  if (next && (!session || next.revision >= session.revision)) session = next;
}

function render(): void {
  const assignment = session?.assignment;
  const active = !!assignment && session!.next < assignment.items.length;
  const finished = !!assignment && !active;
  element("intro").hidden = !!assignment;
  element("review").hidden = !active;
  element("finished").hidden = !finished;
  if (active && renderedPosition !== session!.next) {
    const item = assignment.items[session!.next];
    element("progress").textContent = `Word ${session!.next + 1} of ${assignment.items.length}`;
    element("word").textContent = item.spelling;
    form.reset();
    renderedPosition = session!.next;
    element("word").focus();
  }
  const pending = session?.outbox.length ?? 0;
  if (finished) {
    const title = pending ? "All words reviewed. Still sending…" : "Thank you. Your review is submitted.";
    const heading = element("finished-title");
    if (heading.textContent !== title) { heading.textContent = title; heading.focus(); }
    element("finished-copy").textContent = pending
      ? "Your responses are saved on this device. Keep this page open while they send, or return on this device when the connection is back."
      : "Your judgments will help us understand which spellings feel plausible in English. You can close this page.";
  }
  if (!storageFailed) status.textContent = pending
    ? `${pending} ${pending === 1 ? "response" : "responses"} saved on this device; waiting to send.`
    : assignment ? "All submitted responses have been received." : "Your progress will be saved on this device.";
  retry.hidden = storageFailed || permanentFailure || (!pending && !error.textContent);
  start.disabled = starting || storageFailed || permanentFailure;
  start.textContent = starting ? "Loading your words…" : "Start reviewing";
  updateControls();
}

function storageError(): void {
  storageFailed = true;
  status.textContent = "Review paused: local storage is unavailable.";
  showError("We could not save your progress on this device. Allow site storage and reload this page. The current word has not advanced.");
  render();
}

async function startSession(): Promise<void> {
  if (!ready || starting || storageFailed || permanentFailure) return;
  starting = true;
  showError("");
  render();
  try { acceptSession(await store.ensure(key)); }
  catch { storageError(); starting = false; return; }
  try {
    const assignment = session!.assignment ?? await api.start(session!);
    try { acceptSession(await store.assign(key, assignment)); }
    catch { storageError(); return; }
  } catch (failure) {
    showError(failure instanceof Error ? failure.message : "Unable to start this review.");
    permanentFailure = !(failure instanceof ApiError && failure.retryable);
  } finally { starting = false; render(); }
  void flush();
}

async function save(answer: Answer): Promise<void> {
  if (!session || saving || storageFailed || permanentFailure) return;
  saving = true;
  updateControls();
  try {
    acceptSession(await store.enqueue(key, renderedPosition, answer));
    showError("");
  } catch (failure) {
    if (failure instanceof StalePositionError) {
      try { acceptSession(await store.get(key)); showError(failure.message); }
      catch { storageError(); }
    }
    else storageError();
  } finally { saving = false; render(); }
  void flush();
}

async function flush(): Promise<void> {
  if (flushing || storageFailed || permanentFailure || !session?.assignment) return;
  flushing = true;
  clearTimeout(timer);
  try {
    acceptSession(await store.get(key));
    while (session?.outbox.length) {
      const response = session.outbox[0];
      try { await api.submit(response); }
      catch (failure) {
        const transient = failure instanceof ApiError && failure.retryable;
        permanentFailure = !transient;
        showError(failure instanceof Error ? failure.message : "Unable to send saved responses.");
        if (transient && retryCount < 6) timer = setTimeout(() => void flush(), Math.min(30000, 1000 * 2 ** retryCount++));
        return;
      }
      acceptSession(await store.acknowledge(key, response.response_id));
      retryCount = 0;
      showError("");
      render();
    }
  } catch { storageError(); }
  finally { flushing = false; render(); }
}

start.addEventListener("click", () => void startSession());
form.addEventListener("change", updateControls);
form.addEventListener("submit", event => {
  event.preventDefault();
  const selected = form.querySelector<HTMLInputElement>("input[name=rating]:checked");
  if (selected) void save({ status: "rated", rating: Number(selected.value), familiar: element<HTMLInputElement>("familiar").checked });
});
skip.addEventListener("click", () => void save({ status: "skipped", rating: null, familiar: null }));
function reconnect(): void {
  if (!ready || !session) return;
  retryCount = 0;
  if (!session?.assignment) void startSession();
  else void flush();
}
retry.addEventListener("click", reconnect);
window.addEventListener("online", reconnect);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && session?.assignment) void flush();
});

async function initialize(): Promise<void> {
  if (!url || !publishableKey || !study || publishableKey.startsWith("sb_secret_")) {
    status.textContent = "This study is not configured yet. Please check back with the study owner.";
    return;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) throw new Error("Invalid database URL.");
    store = await ReviewStore.open();
    ready = true;
    acceptSession(await store.get(key));
    render();
    if (session?.assignment) void flush();
  } catch { storageError(); }
}
void initialize();
