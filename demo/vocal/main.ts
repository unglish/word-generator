/**
 * Unglish × Chimera vocal demo: generate a nonce word, speak its IPA via Chimera.
 * Chimera sources under ./chimera are vendored from jamesondh/chimera-vocal-synth (MIT).
 *
 * Boot order matches Chimera: await initChimera() before importing any module that
 * calls into the engine at load time (speech → engine catalog).
 */
import { generateWord } from "../../dist/index.js";
import { initChimera } from "./chimera/wasm/chimera.ts";
import type { BodyMix } from "./chimera/wasm/types.ts";

const BODIES: Record<string, { body: BodyMix; f0: number }> = {
  male: { body: { female: 0, child: 0 }, f0: 110 },
  female: { body: { female: 1, child: 0 }, f0: 205 },
  child: { body: { female: 0, child: 1 }, f0: 260 },
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const wordEl = $<HTMLDivElement>("word");
const ipaEl = $<HTMLDivElement>("ipa");
const statusEl = $<HTMLDivElement>("status");
const levelEl = $<HTMLElement>("level");
const generateBtn = $<HTMLButtonElement>("generate");
const speakBtn = $<HTMLButtonElement>("speak");
const stopBtn = $<HTMLButtonElement>("stop");
const bothBtn = $<HTMLButtonElement>("both");
const bodySel = $<HTMLSelectElement>("body");
const rateSel = $<HTMLSelectElement>("rate");
const morphChk = $<HTMLInputElement>("morph");

let current: { written: string; ipa: string } | null = null;
let ready = false;
let speaking = false;

type EngineApi = {
  engine: {
    prime(): void;
    start(): Promise<void>;
    setBody(b: BodyMix): void;
    setSource(v: { f0: number }): void;
    setVolume(v: number): void;
    readonly analyser: AnalyserNode | null;
    readonly running: boolean;
    readonly ctx: AudioContext | null;
  };
  speakText: (
    text: string,
    o: { ipa: boolean; body: BodyMix; rate: number; f0: number },
  ) => Promise<unknown>;
  stopSpeaking: () => void;
};

let api: EngineApi | null = null;

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

function showWord(written: string, ipa: string): void {
  current = { written, ipa };
  wordEl.textContent = written;
  ipaEl.textContent = ipa ? `/${ipa}/` : "/ /";
  speakBtn.disabled = !ready || !ipa;
  flashWord();
}

function generate(): void {
  const word = generateWord({ mode: "text", morphology: morphChk.checked });
  showWord(word.written.clean, word.pronunciation);
  setStatus(ready ? "Ready." : "Voice still loading…");
}

async function ensureAudio(): Promise<void> {
  if (!api) throw new Error("voice not ready");
  // Sync unlock must run in the click turn before any await (WebKit mute-after-await).
  api.engine.prime();
  await api.engine.start();
  if (api.engine.ctx?.state !== "running") {
    await api.engine.ctx?.resume();
  }
  if (api.engine.ctx?.state !== "running") {
    throw new Error(`AudioContext is ${api.engine.ctx?.state ?? "missing"} — click Speak again to unlock sound`);
  }
  const pick = BODIES[bodySel.value] ?? BODIES.female;
  api.engine.setBody(pick.body);
  api.engine.setSource({ f0: pick.f0 });
  api.engine.setVolume(1);
}

async function speak(): Promise<void> {
  if (!current?.ipa || !ready || !api) return;
  speaking = true;
  speakBtn.disabled = true;
  stopBtn.disabled = false;
  setStatus(`Speaking “${current.written}”…`);
  try {
    await ensureAudio();
    const pick = BODIES[bodySel.value] ?? BODIES.female;
    const rate = Number(rateSel.value) || 1;
    await api.speakText(current.ipa, { ipa: true, body: pick.body, rate, f0: pick.f0 });
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), true);
  } finally {
    speaking = false;
    speakBtn.disabled = !current?.ipa;
    window.setTimeout(() => {
      if (!speaking) stopBtn.disabled = false;
    }, 0);
  }
}

function stop(): void {
  api?.stopSpeaking();
  setStatus("Stopped.");
}

/** Keep destination unlocked on any early gesture (Generate, Voice change, etc.). */
function primeAudioFromGesture(): void {
  api?.engine.prime();
}

generateBtn.addEventListener("click", () => {
  primeAudioFromGesture();
  generate();
});
speakBtn.addEventListener("click", () => {
  primeAudioFromGesture();
  void speak();
});
stopBtn.addEventListener("click", () => stop());
bothBtn.addEventListener("click", () => {
  primeAudioFromGesture();
  generate();
  void speak();
});
bodySel.addEventListener("change", () => {
  primeAudioFromGesture();
  if (!api?.engine.running) return;
  const pick = BODIES[bodySel.value] ?? BODIES.female;
  api.engine.setBody(pick.body);
  api.engine.setSource({ f0: pick.f0 });
});
document.addEventListener("pointerdown", primeAudioFromGesture, { capture: true });
document.addEventListener("keydown", primeAudioFromGesture, { capture: true });

generate();

void (async () => {
  try {
    await initChimera();
    const speech = await import("./chimera/ui/speech.ts");
    const { engine } = await import("./chimera/audio/AudioEngine.ts");
    api = { engine, speakText: speech.speakText, stopSpeaking: speech.stopSpeaking };
    // Meter from the destination-bound analyser (speaker path), not lung telemetry alone —
    // telemetry can move while WebKit has the destination muted.
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
    speakBtn.disabled = !current?.ipa;
    setStatus("Voice ready — generate a word, then Speak.");
  } catch (err) {
    setStatus(`Voice engine failed: ${err instanceof Error ? err.message : String(err)}`, true);
  }
})();
