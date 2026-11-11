/**
 * One-shot OG capture driver: mount the Anatomy3D head and loop nonsense IPA.
 * Served only via Vite during capture; not linked from the public vocal demo.
 */
import { initChimera } from "./chimera/wasm/chimera.ts";
import type { BodyMix } from "./chimera/wasm/types.ts";

const BODY: BodyMix = { female: 1, child: 0 };
const F0 = 205;
const RATE = 1.2;

/** Comical gibberish — not a real Unglish word; strong articulator motion. */
const NONSENSE_IPA = [
  "ˈblɔɪ.fɹə.ɡɪʃ.wʌmp",
  "ˈsnɔɹ.kəl.diŋ.bæs",
  "ˈflɪb.ə.ɹæʃ.tɔɪd",
  "ˈɡɹʌm.pəl.ʃwɑɪk",
  "ˈtwɪŋ.kə.blɔɹf",
  "ˈplɔɹ.ɡɪ.snæʃ",
].join(" | ");

const readyEl = document.getElementById("ready");
const headEl = document.getElementById("head");

function markReady(): void {
  document.documentElement.dataset.ogReady = "1";
  readyEl?.setAttribute("hidden", "");
}

function markError(msg: string): void {
  document.documentElement.dataset.ogError = msg;
  if (readyEl) {
    readyEl.hidden = false;
    readyEl.textContent = msg;
  }
}

async function loopSpeak(
  speakText: (
    text: string,
    o: { ipa: boolean; body: BodyMix; rate: number; f0: number },
  ) => Promise<{ plan: { end: number } } | null>,
): Promise<void> {
  for (;;) {
    document.documentElement.dataset.ogSpeaking = "1";
    const plan = await speakText(NONSENSE_IPA, {
      ipa: true,
      body: BODY,
      rate: RATE,
      f0: F0,
    });
    const endSec = plan?.plan.end ?? 2.5;
    await new Promise((r) =>
      window.setTimeout(r, Math.max(900, endSec * 1000 + 80)),
    );
    document.documentElement.dataset.ogSpeaking = "0";
    await new Promise((r) => window.setTimeout(r, 180));
  }
}

void (async () => {
  try {
    if (!headEl) throw new Error("missing #head");
    await initChimera();
    const speech = await import("./chimera/ui/speech.ts");
    const { engine } = await import("./chimera/audio/AudioEngine.ts");
    const { mountHead } = await import("./chimera/ui/headView.ts");

    engine.prime();
    await engine.start();
    if (engine.ctx?.state !== "running") await engine.ctx?.resume();
    if (engine.ctx?.state !== "running") {
      throw new Error(`AudioContext is ${engine.ctx?.state ?? "missing"}`);
    }
    engine.setBody(BODY);
    engine.setSource({ f0: F0 });
    // Keep gain audible to the graph so the worklet stays hot; video is silent.
    engine.setVolume(1);

    mountHead(headEl, engine, BODY);

    // Wait for home-pose tween (~1.6s) + first telemetry tick.
    const teleDeadline = performance.now() + 8000;
    while (performance.now() < teleDeadline) {
      if (engine.latest) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    if (!engine.latest) {
      console.warn(
        "no telemetry yet; continuing — mouth may stay neutral until speech",
      );
    }

    await new Promise((r) => setTimeout(r, 1700));
    markReady();

    let lastJaw = 0;
    let motionHits = 0;
    engine.onTelemetry((m) => {
      const jaw = m.t.artic?.[0] ?? 0;
      if (Math.abs(jaw - lastJaw) > 0.002) motionHits += 1;
      lastJaw = jaw;
      document.documentElement.dataset.ogMotion = String(motionHits);
      document.documentElement.dataset.ogCtx = engine.ctx?.state ?? "none";
    });

    void loopSpeak(speech.speakText);
  } catch (err) {
    markError(err instanceof Error ? err.message : String(err));
  }
})();
