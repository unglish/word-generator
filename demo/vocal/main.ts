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
    start(): Promise<void>;
    setBody(b: BodyMix): void;
    setSource(v: { f0: number }): void;
    setVolume(v: number): void;
    onTelemetry(l: (t: { t: { pLung: number; voicing: number } }) => void): () => void;
    readonly running: boolean;
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
  await api.engine.start();
  const pick = BODIES[bodySel.value] ?? BODIES.female;
  api.engine.setBody(pick.body);
  api.engine.setSource({ f0: pick.f0 });
  api.engine.setVolume(0.85);
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

generateBtn.addEventListener("click", () => generate());
speakBtn.addEventListener("click", () => void speak());
stopBtn.addEventListener("click", () => stop());
bothBtn.addEventListener("click", () => {
  generate();
  void speak();
});
bodySel.addEventListener("change", () => {
  if (!api?.engine.running) return;
  const pick = BODIES[bodySel.value] ?? BODIES.female;
  api.engine.setBody(pick.body);
  api.engine.setSource({ f0: pick.f0 });
});

generate();

void (async () => {
  try {
    await initChimera();
    const speech = await import("./chimera/ui/speech.ts");
    const { engine } = await import("./chimera/audio/AudioEngine.ts");
    api = { engine, speakText: speech.speakText, stopSpeaking: speech.stopSpeaking };
    engine.onTelemetry((t) => {
      const amp = Math.min(1, Math.abs(t.t.pLung) / 12 + t.t.voicing * 0.35);
      levelEl.style.width = `${Math.round(amp * 100)}%`;
    });
    ready = true;
    speakBtn.disabled = !current?.ipa;
    setStatus("Voice ready — generate a word, then Speak.");
  } catch (err) {
    setStatus(`Voice engine failed: ${err instanceof Error ? err.message : String(err)}`, true);
  }
})();
