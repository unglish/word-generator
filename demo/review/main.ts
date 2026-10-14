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
const more = element<HTMLButtonElement>("more");
const retry = element<HTMLButtonElement>("retry");
const form = element<HTMLFormElement>("rating-form");
const status = element("status");
const error = element("error");
const url = import.meta.env.VITE_REVIEW_SUPABASE_URL ?? "";
const publishableKey = import.meta.env.VITE_REVIEW_SUPABASE_PUBLISHABLE_KEY ?? "";
const study = import.meta.env.VITE_REVIEW_STUDY_ID ?? "";
let key = `${url}|${study}`;
let api = new ReviewApi(url, publishableKey, study);
let store: ReviewStore;
let ready = false;
let session: LocalSession | undefined;
let renderedPosition = -1;
let starting = false, saving = false, flushing = false, storageFailed = false, permanentFailure = false;
let retryCount = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

function renderRubric(): void {
  const rubric = session?.assignment?.rubric ?? RUBRIC;
  element("question").textContent = rubric.question;
  element("instruction").textContent = rubric.instruction ?? "";
  element("instruction").hidden = !rubric.instruction;
  element("familiar-label").textContent = rubric.familiarity;
  element("comment-field").hidden = rubric.version !== RUBRIC.version;
  element("rating-options").replaceChildren(...rubric.labels.map((text, index) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "rating";
    input.value = String(index + 1);
    input.required = true;
    label.append(input, document.createTextNode(text));
    return label;
  }));
}

function showError(message: string): void {
  error.textContent = message;
  error.hidden = !message;
}

function updateControls(): void {
  element<HTMLFieldSetElement>("rating-fieldset").disabled = saving || storageFailed || permanentFailure;
  element<HTMLTextAreaElement>("comment").disabled = saving || storageFailed || permanentFailure;
  submit.disabled = saving || storageFailed || permanentFailure || !form.querySelector("input[name=rating]:checked");
  skip.disabled = saving || storageFailed || permanentFailure;
}

function acceptSession(next: LocalSession | undefined): void {
  // A delayed acknowledgement must never move the UI behind a newer local submission.
  if (next && (!session || next.revision >= session.revision)) {
    if (session && next.id !== session.id) renderedPosition = -1;
    session = next;
  }
}

function completionMessage(current: LocalSession): { title: string; copy: string } {
  if (current.outbox.length) return {
    title: "All words reviewed. Still sending…",
    copy: "Your responses are saved on this device. Keep this page open while they send, or return on this device when the connection is back.",
  };
  if (current.exhausted) return {
    title: "Thank you. You’ve reviewed every spelling in this study.",
    copy: "There are no unseen words left in this review chain. All your responses have been received. You can close this page.",
  };
  if (current.continuing) return {
    title: "Preparing your next words…",
    copy: "Your previous batch is submitted. If the connection is interrupted, retry or return on this device to resume the same next batch.",
  };
  return {
    title: "Thank you. Your review is submitted.",
    copy: "Your judgments will help us understand which spellings look like English words. You can stop here or review another batch of up to 20 unseen words.",
  };
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
    renderRubric();
    form.reset();
    renderedPosition = session!.next;
    element("word").focus();
  }
  const pending = session?.outbox.length ?? 0;
  if (finished) {
    const { title, copy } = completionMessage(session!);
    const heading = element("finished-title");
    if (heading.textContent !== title) { heading.textContent = title; heading.focus(); }
    element("finished-copy").textContent = copy;
  }
  more.hidden = !finished || !!pending || !!session?.continuing || !!session?.exhausted || session?.assignment?.rubric.version !== RUBRIC.version;
  more.disabled = starting || storageFailed || permanentFailure;
  element("next-study").hidden = !finished || !!pending || session?.assignment?.rubric.version === RUBRIC.version;
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
    const requested = session!;
    if (requested.continuing) {
      const result = await api.continue(requested);
      try { acceptSession(await store.continued(key, requested.id, result)); }
      catch { storageError(); return; }
    } else {
      const assignment = requested.assignment ?? await api.start(requested);
      try { acceptSession(await store.assign(key, assignment, requested.id)); }
      catch { storageError(); return; }
    }
  } catch (failure) {
    showError(failure instanceof Error ? failure.message : "Unable to start this review.");
    permanentFailure = !(failure instanceof ApiError && failure.retryable);
  } finally { starting = false; render(); }
  void flush();
}

async function continueReview(): Promise<void> {
  if (starting || flushing || storageFailed || permanentFailure || !session?.assignment || session.outbox.length) return;
  starting = true;
  render();
  try {
    acceptSession(await store.nextBatch(key, session.id));
    renderedPosition = -1;
    showError("");
  } catch { storageError(); }
  finally { starting = false; }
  if (!storageFailed) await startSession();
}

async function save(answer: Answer): Promise<void> {
  if (!session || saving || storageFailed || permanentFailure) return;
  saving = true;
  updateControls();
  const comment = element("comment-field").hidden ? null : element<HTMLTextAreaElement>("comment").value.trim() || null;
  try {
    acceptSession(await store.enqueue(key, renderedPosition, { ...answer, comment }, session.id));
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

more.addEventListener("click", () => void continueReview());
start.addEventListener("click", () => void startSession());
form.addEventListener("change", updateControls);
form.addEventListener("submit", event => {
  event.preventDefault();
  const selected = form.querySelector<HTMLInputElement>("input[name=rating]:checked");
  if (selected) void save({ status: "rated", rating: Number(selected.value), familiar: element<HTMLInputElement>("familiar").checked });
});
skip.addEventListener("click", () => void save({ status: "skipped", rating: null, familiar: null }));
function resumeSession(): void {
  if (!session) return;
  if (!session.assignment || session.continuing) void startSession();
  else void flush();
}

async function reconnect(): Promise<void> {
  if (!ready || !session || storageFailed || permanentFailure) return;
  try { acceptSession(await store.get(key)); }
  catch { storageError(); return; }
  retryCount = 0;
  resumeSession();
}
retry.addEventListener("click", () => void reconnect());
window.addEventListener("online", () => void reconnect());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void reconnect();
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
    if (!session && study === "written-v2-baseline") {
      const legacyKey = `${url}|written-v1-baseline`;
      const legacy = await store.get(legacyKey);
      if (legacy?.assignment && (legacy.next < legacy.assignment.items.length || legacy.outbox.length)) {
        key = legacyKey;
        api = new ReviewApi(url, publishableKey, "written-v1-baseline");
        acceptSession(legacy);
      }
    }
    renderRubric();
    render();
    resumeSession();
  } catch { storageError(); }
}
void initialize();
