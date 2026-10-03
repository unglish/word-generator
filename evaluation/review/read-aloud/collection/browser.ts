import type { CaptureDeclaration, PresentationSubmission } from "./model.js";
import type { Reading } from "../model.js";
import { encodeMonoWav } from "./encoding.js";

interface Context {
  exhausted: boolean;
  phase?: "ready" | "presented";
  session_id: string;
  position: number;
  item_id: string;
  session_length: number;
  instructions: string;
  recording: { sample_rate: number; maximum_seconds: number };
  capture_source: CaptureDeclaration["source"];
  attempt_id?: string;
}
interface PresentationReceipt { attempt_id: string; session_id: string; position: number; item_id: string; spelling: string }
interface LocalAttempt {
  key: string;
  request: PresentationSubmission | null;
  item_id: string;
  capture_source?: CaptureDeclaration["source"];
  phase: "requested" | "capturing" | "recorded" | "failure" | "acknowledged";
  presentation?: PresentationReceipt;
  wav?: ArrayBuffer;
  audio_sha256?: string;
  failure?: { attempt_id: string; status: "skipped" | "recording-failed"; reason: string };
  receipt?: Reading;
}

/** Self-contained browser entry; serialized only after TypeScript compilation. */
export async function readAloudBrowser(encode: typeof encodeMonoWav): Promise<void> {
  const element = (id: string): HTMLElement => document.getElementById(id)!;
  const actions = element("actions"), notice = element("notice"), word = element("word");
  let token = location.hash.slice(1), database: IDBDatabase, context: Context, pending: LocalAttempt | null = null;
  let active: { audio: AudioContext; node: AudioWorkletNode; source: AudioNode; stream?: MediaStream } | null = null;
  let busy = false, recordingInMemoryOnly = false, ownerKey = "", release: (() => void) | undefined;
  const keyFor = (session: string, position: number): string => session + "/" + position;
  const hash = async (bytes: BufferSource): Promise<string> => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(value => value.toString(16).padStart(2, "0")).join("");
  const randomId = (): string => [...crypto.getRandomValues(new Uint8Array(32))].map(value => value.toString(16).padStart(2, "0")).join("");
  function button(text: string, handler: () => Promise<void>): void {
    const control = document.createElement("button"); control.type = "button"; control.textContent = text; control.disabled = busy;
    control.addEventListener("click", () => { if (!busy) void guarded(handler); }); actions.append(control);
  }
  function lock(value: boolean): void {
    busy = value; actions.querySelectorAll("button").forEach(control => { control.disabled = value; });
  }
  async function guarded(action: () => Promise<void>): Promise<void> {
    lock(true);
    try { await action(); }
    catch (error) { notice.textContent = error instanceof Error ? error.message : "Unable to continue. Your original recording has not been replaced."; }
    finally { lock(false); }
  }
  async function request<T>(path: string, body?: object | ArrayBuffer): Promise<T> {
    const binary = body instanceof ArrayBuffer;
    const response = await fetch(path, { method: body ? "POST" : "GET", headers: { Authorization: "Bearer " + token,
      ...(body ? { "content-type": binary ? "audio/wav" : "application/json" } : {}) },
    ...(body ? { body: binary ? body : JSON.stringify(body) } : {}) });
    const value = await response.json(); if (!response.ok) throw new Error(value.error ?? "Unable to confirm the original recording. Retry when connected.");
    return value as T;
  }
  function transaction<T>(write: boolean, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return new Promise((accept, reject) => {
      const tx = database.transaction("attempts", write ? "readwrite" : "readonly", write ? { durability: "strict" } : {});
      if (write && tx.durability !== "strict") { tx.abort(); reject(new Error("This browser cannot confirm local recording storage. Use a supported browser before starting.")); return; }
      const request = operation(tx.objectStore("attempts")); let result: T;
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => accept(result);
      tx.onabort = () => reject(tx.error ?? new Error("Local recording storage was interrupted."));
      tx.onerror = () => { /* The abort handler reports the transaction failure. */ };
    });
  }
  async function save(attempt: LocalAttempt): Promise<void> {
    await transaction(true, store => store.put(attempt)); pending = attempt;
  }
  async function stopAudio(): Promise<void> {
    const previous = active; active = null; if (!previous) return;
    previous.node.port.onmessage = null; previous.source.disconnect(); previous.node.disconnect(); previous.stream?.getTracks().forEach(track => track.stop());
    await previous.audio.close();
  }
  function recoverView(): void {
    actions.replaceChildren(); word.textContent = "";
    if (!pending) return;
    const captureSource = pending.request?.capture.source ?? pending.capture_source;
    element("fixture").textContent = captureSource === "synthetic-fixture" ? "Development fixture: synthetic tone only. No microphone or speech." :
      captureSource === "microphone" ? "" : "Recording source could not be checked; contact the study owner.";
    if (pending.wav && pending.phase !== "acknowledged") {
      notice.textContent = recordingInMemoryOnly ? "Your first recording is held in this tab. Keep it open and retry saving the same recording." : "Your first recording is retained on this device. Retry to confirm that same recording.";
      button("Retry saved recording", upload);
      button("Download saved recording", async () => {
        const url = URL.createObjectURL(new Blob([pending!.wav!], { type: "audio/wav" })), link = document.createElement("a");
        link.href = url; link.download = "first-recording-" + pending!.audio_sha256 + ".wav"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    } else if (pending.failure) {
      notice.textContent = "Your original skip or loss record is retained. Retry to confirm it."; button("Retry original outcome", submitFailure);
    } else {
      notice.textContent = "This word was interrupted before its recording was retained. A second recording cannot be started.";
      button("Mark recording lost", async () => {
        if (!pending!.presentation) {
          if (!pending!.request) throw new Error("Original presentation request missing; contact the study owner.");
          await save(pending!);
          const presentation = await request<PresentationReceipt>("/api/presentation", pending!.request);
          await save({ ...pending!, presentation });
        }
        await chooseFailure("recording-failed", "First presentation or capture was interrupted before original encoded bytes were retained.");
      });
    }
  }
  async function next(): Promise<void> {
    await stopAudio(); actions.replaceChildren(); word.textContent = ""; pending = null;
    const entries = await transaction(false, store => store.getAll()) as LocalAttempt[];
    const unresolved = entries.filter(entry => entry.phase !== "acknowledged");
    if (unresolved.length > 1) throw new Error("Several original outcomes are pending. Contact the study owner; no recording will be replaced.");
    if (unresolved.length) { pending = unresolved[0]; recoverView(); return; }
    context = await request<Context>("/api/next");
    if (context.exhausted) { element("progress").textContent = "All assigned words completed."; notice.textContent = "Your outcomes are confirmed. Thank you."; return; }
    element("instruction").textContent = context.instructions;
    element("fixture").textContent = context.capture_source === "synthetic-fixture" ? "Development fixture: synthetic tone only. No microphone or speech." : "";
    element("progress").textContent = "Word " + (context.position + 1) + " of " + context.session_length + " in this session";
    if (context.phase === "presented") {
      notice.textContent = "An earlier presentation has no original recording retained on this device. It cannot be recorded again.";
      button("Mark recording lost", async () => {
        const failure = { attempt_id: context.attempt_id!, status: "recording-failed" as const, reason: "Interrupted first presentation; no original encoded recording retained on this device." };
        // The server already binds this presentation; no new presentation request is made.
        pending = { key: keyFor(context.session_id, context.position), item_id: context.item_id, capture_source: context.capture_source, request: null, phase: "failure", failure };
        await save(pending); recoverView(); await submitFailure();
      });
      return;
    }
    notice.textContent = "Start when you are ready to read the next word once."; button("Start word", start);
  }
  async function upload(): Promise<void> {
    if (!pending?.wav || !pending.request || !pending.presentation || !pending.audio_sha256) throw new Error("The original local recording is incomplete; contact the study owner.");
    if (await hash(pending.wav) !== pending.audio_sha256) throw new Error("The retained first recording changed. Contact the study owner.");
    await save(pending); recordingInMemoryOnly = false;
    notice.textContent = "Confirming your saved recording…";
    const receipt = await request<{ reading: Reading }>("/api/recording/" + pending.presentation.attempt_id, pending.wav);
    if (receipt.reading.outcome.status !== "recorded" || receipt.reading.outcome.audio.sha256 !== pending.audio_sha256 ||
        receipt.reading.session_id !== pending.request.session_id || receipt.reading.position !== pending.request.position || receipt.reading.item_id !== pending.item_id || receipt.reading.first_attempt !== true || receipt.reading.version !== "read-aloud-recording-v1") {
      throw new Error("Confirmation does not match the original recording. Contact the study owner.");
    }
    await save({ ...pending, phase: "acknowledged", receipt: receipt.reading }); await next();
  }
  async function submitFailure(): Promise<void> {
    if (!pending?.failure) throw new Error("Original outcome missing.");
    await save(pending);
    const receipt = await request<{ reading: Reading }>("/api/failure", pending.failure);
    if (receipt.reading.outcome.status !== pending.failure.status || receipt.reading.outcome.reason !== pending.failure.reason || keyFor(receipt.reading.session_id, receipt.reading.position) !== pending.key ||
        receipt.reading.item_id !== pending.item_id || receipt.reading.first_attempt !== true || receipt.reading.version !== "read-aloud-recording-v1") throw new Error("Outcome confirmation changed. Contact the study owner.");
    await save({ ...pending, phase: "acknowledged", receipt: receipt.reading }); await next();
  }
  async function chooseFailure(status: "skipped" | "recording-failed", reason: string): Promise<void> {
    if (!pending?.presentation || pending.wav) throw new Error("An original recording cannot be replaced with a skip or failure.");
    await stopAudio(); pending = { ...pending, phase: "failure", failure: { attempt_id: pending.presentation.attempt_id, status, reason } };
    await save(pending);
    recoverView(); await submitFailure();
  }
  async function finish(samples: ArrayBuffer): Promise<void> {
    await stopAudio(); word.textContent = "";
    if (!pending || !pending.request || pending.phase !== "capturing") throw new Error("Unexpected recording completion; contact the study owner.");
    const wav = encode(new Float32Array(samples), pending.request.capture.context_sample_rate);
    pending = { ...pending, phase: "recorded", wav, audio_sha256: await hash(wav) }; recordingInMemoryOnly = true;
    await save(pending); recordingInMemoryOnly = false;
    recoverView(); await upload();
  }
  async function waitForCapture(stage: Promise<void>): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([stage, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Audio capture did not become ready. No second reading will be started.")), 30000); })]);
    } finally { clearTimeout(timer); }
  }
  async function start(): Promise<void> {
    let audio: AudioContext | undefined, stream: MediaStream | undefined;
    try {
      audio = new AudioContext({ sampleRate: context.recording.sample_rate });
      if (audio.sampleRate !== context.recording.sample_rate) throw new Error("This device cannot use the study recording rate. No word has been shown.");
      let source: AudioNode, capture: CaptureDeclaration;
      if (context.capture_source === "synthetic-fixture") {
        const buffer = audio.createBuffer(1, 256, audio.sampleRate); buffer.getChannelData(0).fill(0.125);
        const fixture = audio.createBufferSource(); fixture.buffer = buffer; fixture.loop = true; fixture.start(); source = fixture;
        capture = { source: "synthetic-fixture", context_sample_rate: audio.sampleRate, device_sample_rate: null, device_channel_count: null,
          echo_cancellation: null, noise_suppression: null, auto_gain_control: null };
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: { ideal: 1 }, sampleRate: { ideal: audio.sampleRate },
          echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        source = audio.createMediaStreamSource(stream);
        const settings = stream.getAudioTracks()[0].getSettings() as MediaTrackSettings & { channelCount?: number };
        capture = { source: "microphone", context_sample_rate: audio.sampleRate, device_sample_rate: settings.sampleRate ?? null,
          device_channel_count: settings.channelCount ?? null, echo_cancellation: settings.echoCancellation ?? null,
          noise_suppression: settings.noiseSuppression ?? null, auto_gain_control: settings.autoGainControl ?? null };
      }
      await audio.audioWorklet.addModule("/recorder-worklet.js");
      const node = new AudioWorkletNode(audio, "first-recording", { channelCount: 1, channelCountMode: "explicit", numberOfInputs: 1,
        numberOfOutputs: 1, outputChannelCount: [1], processorOptions: { maximumFrames: Math.floor(audio.sampleRate * context.recording.maximum_seconds) } });
      const mute = audio.createGain(); mute.gain.value = 0; source.connect(node); node.connect(mute); mute.connect(audio.destination);
      active = { audio, node, source, stream };
      let captureError: Error | undefined;
      let started: (() => void) | undefined, ready: (() => void) | undefined, rejectReady: ((error: Error) => void) | undefined;
      const warmed = new Promise<void>((accept, reject) => { ready = accept; rejectReady = reject; });
      let rejectStarted: ((error: Error) => void) | undefined;
      node.port.onmessage = event => {
        if (event.data.kind === "ready") ready?.();
        else if (event.data.kind === "started") started?.();
        else if (event.data.kind === "complete") void guarded(async () => { try { await finish(event.data.samples); } catch (error) { recoverView(); throw error; } });
        else if (event.data.kind === "failed") void guarded(async () => { await chooseFailure("recording-failed", event.data.reason); });
      };
      node.addEventListener("processorerror", () => {
        const error = new Error("First capture processor failed before original encoded bytes were retained."); captureError = error;
        if (pending?.phase === "capturing") void guarded(async () => { await chooseFailure("recording-failed", error.message); });
        rejectReady?.(error); rejectStarted?.(error);
      });
      stream?.getAudioTracks()[0].addEventListener("ended", () => { if (pending?.phase === "capturing") void guarded(async () => { await chooseFailure("recording-failed", "Microphone input ended during first capture."); }); });
      await audio.resume(); await waitForCapture(warmed);
      if (captureError) throw captureError;
      const requestValue: PresentationSubmission = { session_id: context.session_id, position: context.position, request_id: randomId(), capture };
      await save({ key: keyFor(context.session_id, context.position), item_id: context.item_id, capture_source: context.capture_source, request: requestValue, phase: "requested" });
      const presentation = await request<PresentationReceipt>("/api/presentation", requestValue);
      await save({ ...pending!, presentation, phase: "capturing" });
      const armed = new Promise<void>((accept, reject) => { started = accept; rejectStarted = reject; });
      if (captureError) throw captureError;
      node.port.postMessage("start"); await waitForCapture(armed);
      word.textContent = presentation.spelling; word.focus(); actions.replaceChildren(); notice.textContent = "Recording… Read once, then finish.";
      button("Finish recording", async () => { actions.replaceChildren(); notice.textContent = "Retaining your first recording…"; node.port.postMessage("stop"); });
      button("Skip this word", async () => { await chooseFailure("skipped", "Reader explicitly skipped the first presented word."); });
    } catch (error) {
      if (active) await stopAudio(); else { stream?.getTracks().forEach(track => track.stop()); await audio?.close(); }
      if (pending) recoverView(); throw error;
    }
  }
  try {
    if (token) { if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("Use the reader link provided by the study owner."); sessionStorage.setItem("read-aloud-token", token); history.replaceState(null, "", "/"); }
    else token = sessionStorage.getItem("read-aloud-token") ?? "";
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("Use the reader link provided by the study owner.");
    ownerKey = await hash(new TextEncoder().encode(token));
    database = await new Promise<IDBDatabase>((accept, reject) => {
      const open = indexedDB.open("read-aloud-v1-" + ownerKey, 1);
      open.onupgradeneeded = () => { open.result.createObjectStore("attempts", { keyPath: "key" }); };
      open.onsuccess = () => accept(open.result); open.onerror = () => reject(open.error);
      open.onblocked = () => reject(new Error("Close other study tabs before continuing."));
    });
    if (!navigator.locks) throw new Error("This browser cannot keep one recording tab active. Use a supported browser.");
    await new Promise<void>((accept, reject) => {
      void navigator.locks.request("read-aloud-" + ownerKey, { ifAvailable: true }, async lease => {
        if (!lease) { reject(new Error("This reader link is already open in another tab. Close it before continuing.")); return; }
        accept(); await new Promise<void>(done => { release = done; });
      }).catch(reject);
    });
    window.addEventListener("pagehide", () => { void stopAudio(); release?.(); database.close(); });
    await next();
  } catch (error) { notice.textContent = error instanceof Error ? error.message : "Unable to open your study. No word has been shown."; }
}
