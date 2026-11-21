/**
 * Unglish × Chimera vocal demo: generate a nonce word (or short poem), speak IPA via Chimera.
 * Chimera sources under ./chimera are vendored from jamesondh/chimera-vocal-synth (MIT).
 *
 * Boot order matches Chimera: await initChimera() before importing any module that
 * calls into the engine at load time (speech → engine catalog).
 */
import { generateWord, generateWords, toNarrowPronunciation } from "../../dist/index.js";
import { initChimera } from "./chimera/wasm/chimera.ts";
import type { BodyMix } from "./chimera/wasm/types.ts";
import { isLikelyIosSafari, unlockIosPlaybackSession } from "./iosAudio.ts";
import type { HeadHandle } from "./chimera/ui/headView.ts";

type GeneratedWord = ReturnType<typeof generateWord>;

type PoemLine = {
  written: string;
  /** broad IPA for display (words joined by space) */
  ipa: string;
  /** narrow IPA for Chimera (words joined by space) */
  speakIpa: string;
  words: GeneratedWord[];
};

type CurrentWord = {
  kind: "word";
  written: string;
  ipa: string;
  word: GeneratedWord;
};

type CurrentPoem = {
  kind: "poem";
  written: string;
  ipa: string;
  lines: PoemLine[];
};

type Current = CurrentWord | CurrentPoem;

/** Short stanza: four lines × two nonce words, spoken with inter-line pauses. */
const POEM_LINES = 4;
const POEM_WORDS_PER_LINE = 2;
/** Chimera planPhrases pause after each line except the last (seconds). */
const POEM_LINE_PAUSE_SEC = 0.55;

/**
 * Voice presets: BodyMix weights (male = both axes 0) plus default f0 (Hz).
 * Retune f0 here, or blend BodyMix continuously (e.g. female: 0.5) for in-between bodies.
 * Chimera's engine also exposes `defaultF0` blending in ui/body.ts.
 */
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
const modeSel = $<HTMLSelectElement>("mode");
const bodySel = $<HTMLSelectElement>("body");
const rateSel = $<HTMLSelectElement>("rate");
const morphChk = $<HTMLInputElement>("morph");

let current: Current | null = null;
let ready = false;
let speaking = false;
let head: HeadHandle | null = null;

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
  speakIpaLines: (
    lines: string[],
    o: { body: BodyMix; rate: number; f0: number; linePause?: number },
  ) => { plan: { end: number } } | null;
  stopSpeaking: () => void;
};

let api: EngineApi | null = null;

function isPoemMode(): boolean {
  return modeSel.value === "poem";
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

function canSpeak(c: Current | null): boolean {
  if (!c) return false;
  if (c.kind === "word") return Boolean(c.ipa);
  return c.lines.some((line) => line.speakIpa.length > 0);
}

function showCurrent(next: Current): void {
  current = next;
  const poem = next.kind === "poem";
  wordEl.classList.toggle("poem", poem);
  ipaEl.classList.toggle("poem", poem);
  wordEl.textContent = next.written;
  ipaEl.textContent = next.ipa;
  speakBtn.disabled = !ready || !canSpeak(next);
  flashWord();
}

function showWord(word: GeneratedWord): void {
  // UI keeps broad legacy IPA; Speak projects separately (docs/narrow-ipa.md).
  showCurrent({
    kind: "word",
    written: word.written.clean,
    ipa: word.pronunciation ? `/${word.pronunciation}/` : "/ /",
    word,
  });
}

function buildPoemLine(words: GeneratedWord[]): PoemLine {
  const written = words.map((w) => w.written.clean).join(" ");
  const ipa = words
    .map((w) => w.pronunciation)
    .filter(Boolean)
    .join(" ");
  const speakIpa = words
    .map((w) => toNarrowPronunciation(w))
    .filter(Boolean)
    .join(" ");
  return { written, ipa, speakIpa, words };
}

function showPoem(lines: PoemLine[]): void {
  const written = lines.map((l) => l.written).join("\n");
  const ipa = lines.map((l) => (l.ipa ? `/${l.ipa}/` : "/ /")).join("\n");
  showCurrent({ kind: "poem", written, ipa, lines });
}

function generate(): void {
  const morphology = morphChk.checked;
  if (isPoemMode()) {
    const bag = generateWords(POEM_LINES * POEM_WORDS_PER_LINE, {
      mode: "text",
      morphology,
    });
    const lines: PoemLine[] = [];
    for (let i = 0; i < POEM_LINES; i++) {
      const slice = bag.slice(i * POEM_WORDS_PER_LINE, (i + 1) * POEM_WORDS_PER_LINE);
      lines.push(buildPoemLine(slice));
    }
    showPoem(lines);
  } else {
    showWord(generateWord({ mode: "text", morphology }));
  }
  setStatus(ready ? "Ready." : "Voice still loading…");
}

async function ensureAudio(): Promise<void> {
  if (!api) throw new Error("voice not ready");
  // Sync unlock must run in the click turn before any await (WebKit mute-after-await /
  // iOS Ring/Silent ambient session).
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

async function speak(): Promise<void> {
  if (!current || !canSpeak(current) || !ready || !api) return;
  speaking = true;
  speakBtn.disabled = true;
  stopBtn.disabled = false;
  const label = current.kind === "poem" ? "poem" : current.written;
  setStatus(current.kind === "poem" ? "Speaking poem…" : `Speaking “${label}”…`);
  try {
    await ensureAudio();
    const pick = BODIES[bodySel.value] ?? BODIES.female;
    const rate = Number(rateSel.value) || 1;
    let endSec = 0;
    if (current.kind === "poem") {
      const plan = api.speakIpaLines(
        current.lines.map((l) => l.speakIpa),
        { body: pick.body, rate, f0: pick.f0, linePause: POEM_LINE_PAUSE_SEC },
      );
      endSec = plan?.plan.end ?? 0;
    } else {
      // Prefer syllable-backed phones → chimera-english-v1 glyphs; display stays broad.
      const speakIpa = toNarrowPronunciation(current.word);
      const plan = await api.speakText(speakIpa, { ipa: true, body: pick.body, rate, f0: pick.f0 });
      endSec = plan?.plan.end ?? 0;
    }
    // speak* resolves when the gesture plan is queued, not when audio ends.
    const spokenKind = current.kind;
    window.setTimeout(() => {
      if (!speaking) {
        const msg = statusEl.textContent ?? "";
        if (
          (spokenKind === "poem" && msg.startsWith("Speaking poem")) ||
          (spokenKind === "word" && msg.startsWith(`Speaking “${label}”`))
        ) {
          setStatus("Ready.");
        }
      }
    }, Math.max(400, endSec * 1000 + 150));
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), true);
  } finally {
    speaking = false;
    speakBtn.disabled = !canSpeak(current);
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
  unlockIosPlaybackSession();
  api?.engine.prime();
}

generateBtn.addEventListener("click", () => {
  primeAudioFromGesture();
  generate();
  // Warm the worklet on Generate so Speak's gesture is not spent on addModule.
  if (ready && api && !api.engine.graphReady) void api.engine.start().catch(() => {});
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
modeSel.addEventListener("change", () => {
  primeAudioFromGesture();
  generate();
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

generate();

void (async () => {
  try {
    await initChimera();
    const speech = await import("./chimera/ui/speech.ts");
    const { engine } = await import("./chimera/audio/AudioEngine.ts");
    const { mountHead } = await import("./chimera/ui/headView.ts");
    api = {
      engine,
      speakText: speech.speakText,
      speakIpaLines: speech.speakIpaLines,
      stopSpeaking: speech.stopSpeaking,
    };
    const pick = BODIES[bodySel.value] ?? BODIES.female;
    const headEl = document.getElementById("head");
    if (headEl) head = mountHead(headEl, engine, pick.body);
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
    speakBtn.disabled = !canSpeak(current);
    setStatus(
      isLikelyIosSafari()
        ? "Voice ready — tap Generate or Speak (unlocks audio; ignores Ring/Silent on iOS 17+)."
        : "Voice ready — generate a word or poem, then Speak.",
    );
  } catch (err) {
    setStatus(`Voice engine failed: ${err instanceof Error ? err.message : String(err)}`, true);
  }
})();
