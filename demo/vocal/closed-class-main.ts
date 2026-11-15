/**
 * Closed-class vocal demo: showcase the #444 function-word channel with Chimera.
 * UI pattern follows the Unglish Chimera vocal demo (3D head / Speak / IPA) with
 * tiny-voca-style example chips for the curated closed-class set.
 */
import {
  createGenerator,
  englishConfig,
  toNarrowIpa,
  toNarrowPronunciation,
} from "../../dist/index.js";
import { initChimera } from "./chimera/wasm/chimera.ts";
import type { BodyMix } from "./chimera/wasm/types.ts";
import { isLikelyIosSafari, unlockIosPlaybackSession } from "./iosAudio.ts";
import type { HeadHandle } from "./chimera/ui/headView.ts";
import {
  CLOSED_CLASS_DEMO,
  formatIpaWithPhonetic,
  type ClosedClassDemoEntry,
} from "./closed-class-catalog.ts";

type GeneratedWord = ReturnType<ReturnType<typeof createGenerator>["generateWord"]>;

const BODIES: Record<string, { body: BodyMix; f0: number }> = {
  male: { body: { female: 0, child: 0 }, f0: 110 },
  female: { body: { female: 1, child: 0 }, f0: 205 },
  child: { body: { female: 0, child: 1 }, f0: 260 },
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const wordEl = $<HTMLDivElement>("word");
const ipaEl = $<HTMLDivElement>("ipa");
const badgeEl = $<HTMLDivElement>("badge");
const statusEl = $<HTMLDivElement>("status");
const levelEl = $<HTMLElement>("level");
const chipsEl = $<HTMLDivElement>("chips");
const speakBtn = $<HTMLButtonElement>("speak");
const stopBtn = $<HTMLButtonElement>("stop");
const nextBtn = $<HTMLButtonElement>("next");
const sampleBtn = $<HTMLButtonElement>("sample");
const speakAllBtn = $<HTMLButtonElement>("speak-all");
const bodySel = $<HTMLSelectElement>("body");
const rateSel = $<HTMLSelectElement>("rate");

type Current = {
  entry: ClosedClassDemoEntry;
  word: GeneratedWord | null;
  /** Narrow IPA for Chimera Speak. */
  speakIpa: string;
};

let current: Current | null = null;
let ready = false;
let speaking = false;
let head: HeadHandle | null = null;
let catalogIndex = 0;

type EngineApi = {
  engine: {
    prime(): void;
    start(): Promise<void>;
    setBody(b: BodyMix): void;
    setSource(v: { f0: number }): void;
    setVolume(v: number): void;
    readonly analyser: AnalyserNode | null;
    readonly running: boolean;
    readonly graphReady: boolean;
    readonly ctx: AudioContext | null;
    readonly sampleRate: number;
  };
  speakText: (
    text: string,
    o: { ipa: boolean; body: BodyMix; rate: number; f0: number },
  ) => Promise<{ plan: { end: number } } | null>;
  stopSpeaking: () => void;
};

let api: EngineApi | null = null;

const closedClassEntries = englishConfig.closedClass?.entries ?? [];

function generatorForEntry(entry: ClosedClassDemoEntry) {
  const configEntry = closedClassEntries.find((item) => item.name === entry.name);
  if (!configEntry) {
    throw new Error(`closed-class config missing entry "${entry.name}"`);
  }
  return createGenerator({
    ...englishConfig,
    closedClass: {
      probability: 1,
      entries: [configEntry],
    },
  });
}

function emitFromChannel(entry: ClosedClassDemoEntry, seed: number): GeneratedWord {
  const gen = generatorForEntry(entry);
  const word = gen.generateWord({ seed, morphology: false, trace: true });
  if (word.provenance?.kind !== "closedClass" || word.written.clean !== entry.spelling) {
    throw new Error(
      `expected closedClass:${entry.name}, got ${word.provenance?.kind ?? "none"} “${word.written.clean}”`,
    );
  }
  return word;
}

function setStatus(msg: string, error = false): void {
  statusEl.textContent = msg;
  statusEl.classList.toggle("error", error);
}

function flashWord(): void {
  wordEl.classList.remove("flash");
  void wordEl.offsetWidth;
  wordEl.classList.add("flash");
  window.setTimeout(() => wordEl.classList.remove("flash"), 260);
}

function syncChips(activeName: string): void {
  for (const btn of chipsEl.querySelectorAll<HTMLButtonElement>("[data-name]")) {
    btn.classList.toggle("active", btn.dataset.name === activeName);
    btn.setAttribute("aria-pressed", btn.dataset.name === activeName ? "true" : "false");
  }
}

function showEntry(entry: ClosedClassDemoEntry, word: GeneratedWord | null): void {
  const speakIpa = word
    ? toNarrowPronunciation(word)
    : toNarrowIpa(entry.ipa.replace(/[ˈˌ.]/g, ""));
  current = { entry, word, speakIpa };
  catalogIndex = CLOSED_CLASS_DEMO.findIndex((item) => item.name === entry.name);
  wordEl.textContent = entry.spelling;
  ipaEl.textContent = formatIpaWithPhonetic(entry.ipa, entry.phonetic);
  const pathLabel = entry.path === "gap" ? "gap-catalog" : "productive-path";
  badgeEl.textContent = `closed-class · function word · ${pathLabel}`;
  syncChips(entry.name);
  speakBtn.disabled = !ready || !speakIpa;
  flashWord();
}

function selectEntry(entry: ClosedClassDemoEntry, seed = Date.now() % 1_000_000): void {
  try {
    const word = emitFromChannel(entry, seed);
    showEntry(entry, word);
    setStatus(
      ready
        ? `Channel output · provenance closedClass:${entry.name}`
        : "Voice still loading…",
    );
  } catch (err) {
    // Fall back to curated phones so Speak still works if dist is stale.
    showEntry(entry, null);
    setStatus(
      `Curated phones (generator: ${err instanceof Error ? err.message : String(err)})`,
      true,
    );
  }
}

function pickNext(): void {
  const next = (catalogIndex + 1) % CLOSED_CLASS_DEMO.length;
  selectEntry(CLOSED_CLASS_DEMO[next]);
}

function sampleRandom(): void {
  const idx = Math.floor(Math.random() * CLOSED_CLASS_DEMO.length);
  selectEntry(CLOSED_CLASS_DEMO[idx], Math.floor(Math.random() * 1_000_000));
}

async function ensureAudio(): Promise<void> {
  if (!api) throw new Error("voice not ready");
  unlockIosPlaybackSession();
  api.engine.prime();
  await api.engine.start();
  unlockIosPlaybackSession();
  if (api.engine.ctx?.state !== "running") {
    await api.engine.ctx?.resume();
  }
  if (api.engine.ctx?.state !== "running") {
    throw new Error(`AudioContext is ${api.engine.ctx?.state ?? "missing"} — tap Speak again to unlock sound`);
  }
  const pick = BODIES[bodySel.value] ?? BODIES.female;
  api.engine.setBody(pick.body);
  api.engine.setSource({ f0: pick.f0 });
  api.engine.setVolume(1);
  head?.setBody(pick.body, api.engine.sampleRate);
}

async function speakOne(speakIpa: string, label: string): Promise<number> {
  if (!api) return 0;
  await ensureAudio();
  const pick = BODIES[bodySel.value] ?? BODIES.female;
  const rate = Number(rateSel.value) || 1;
  const plan = await api.speakText(speakIpa, {
    ipa: true,
    body: pick.body,
    rate,
    f0: pick.f0,
  });
  return plan?.plan.end ?? 0.4;
}

async function speak(): Promise<void> {
  if (!current?.speakIpa || !ready || !api) return;
  speaking = true;
  speakBtn.disabled = true;
  stopBtn.disabled = false;
  const spoken = current.entry.spelling;
  setStatus(`Speaking “${spoken}”…`);
  try {
    const endSec = await speakOne(current.speakIpa, spoken);
    window.setTimeout(() => {
      if (statusEl.textContent?.startsWith(`Speaking “${spoken}”`)) {
        setStatus("Ready.");
      }
    }, Math.max(400, endSec * 1000 + 150));
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), true);
  } finally {
    speaking = false;
    speakBtn.disabled = !current?.speakIpa;
  }
}

async function speakAll(): Promise<void> {
  if (!ready || !api || speaking) return;
  speaking = true;
  speakBtn.disabled = true;
  speakAllBtn.disabled = true;
  stopBtn.disabled = false;
  setStatus("Speaking closed-class catalog…");
  try {
    for (let i = 0; i < CLOSED_CLASS_DEMO.length; i++) {
      if (!speaking) break;
      const entry = CLOSED_CLASS_DEMO[i];
      selectEntry(entry, 1000 + i);
      if (!current?.speakIpa) continue;
      setStatus(`Speaking catalog ${i + 1}/${CLOSED_CLASS_DEMO.length}: “${entry.spelling}”…`);
      const endSec = await speakOne(current.speakIpa, entry.spelling);
      await new Promise((resolve) => window.setTimeout(resolve, Math.max(350, endSec * 1000 + 220)));
    }
    if (speaking) setStatus("Catalog finished.");
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), true);
  } finally {
    speaking = false;
    speakBtn.disabled = !current?.speakIpa;
    speakAllBtn.disabled = false;
  }
}

function stop(): void {
  speaking = false;
  api?.stopSpeaking();
  setStatus("Stopped.");
}

function primeAudioFromGesture(): void {
  unlockIosPlaybackSession();
  api?.engine.prime();
}

function buildChips(): void {
  chipsEl.replaceChildren();
  for (const entry of CLOSED_CLASS_DEMO) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.dataset.name = entry.name;
    btn.textContent = entry.spelling;
    btn.title = formatIpaWithPhonetic(entry.ipa, entry.phonetic);
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => {
      primeAudioFromGesture();
      selectEntry(entry);
      if (ready && api && !api.engine.graphReady) void api.engine.start().catch(() => {});
    });
    chipsEl.append(btn);
  }
}

speakBtn.addEventListener("click", () => {
  primeAudioFromGesture();
  void speak();
});
stopBtn.addEventListener("click", () => stop());
nextBtn.addEventListener("click", () => {
  primeAudioFromGesture();
  pickNext();
});
sampleBtn.addEventListener("click", () => {
  primeAudioFromGesture();
  sampleRandom();
});
speakAllBtn.addEventListener("click", () => {
  primeAudioFromGesture();
  void speakAll();
});
bodySel.addEventListener("change", () => {
  primeAudioFromGesture();
  const pick = BODIES[bodySel.value] ?? BODIES.female;
  if (api) {
    head?.setBody(pick.body, api.engine.sampleRate);
    if (api.engine.running) {
      api.engine.setBody(pick.body);
      api.engine.setSource({ f0: pick.f0 });
    }
  }
});
document.addEventListener("pointerdown", primeAudioFromGesture, { capture: true });
document.addEventListener("touchstart", primeAudioFromGesture, { capture: true, passive: true });
document.addEventListener("keydown", primeAudioFromGesture, { capture: true });

buildChips();
selectEntry(CLOSED_CLASS_DEMO[0], 85);

void (async () => {
  try {
    await initChimera();
    const speech = await import("./chimera/ui/speech.ts");
    const { engine } = await import("./chimera/audio/AudioEngine.ts");
    const { mountHead } = await import("./chimera/ui/headView.ts");
    api = { engine, speakText: speech.speakText, stopSpeaking: speech.stopSpeaking };
    const pick = BODIES[bodySel.value] ?? BODIES.female;
    const headEl = document.getElementById("head");
    if (headEl) head = mountHead(headEl, engine, pick.body);
    let timeBuf = new Uint8Array(0);
    const tickMeter = () => {
      const a = engine.analyser;
      if (a) {
        if (timeBuf.length !== a.fftSize) timeBuf = new Uint8Array(a.fftSize);
        a.getByteTimeDomainData(timeBuf);
        let peak = 0;
        for (let i = 0; i < timeBuf.length; i++) peak = Math.max(peak, Math.abs(timeBuf[i] - 128));
        levelEl.style.width = `${Math.min(100, Math.round((peak / 128) * 160))}%`;
      }
      requestAnimationFrame(tickMeter);
    };
    requestAnimationFrame(tickMeter);
    ready = true;
    speakBtn.disabled = !current?.speakIpa;
    setStatus(
      isLikelyIosSafari()
        ? "Voice ready — tap a function word or Speak (unlocks audio on iOS)."
        : "Voice ready — pick a closed-class word, then Speak.",
    );
  } catch (err) {
    setStatus(`Voice engine failed: ${err instanceof Error ? err.message : String(err)}`, true);
  }
})();
