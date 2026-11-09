/**
 * iOS Safari routes Web Audio to the ringer/ambient channel by default, so the
 * hardware Ring/Silent switch mutes Chimera while HTMLMediaElement audio still plays.
 * Safari 17+: set navigator.audioSession.type = "playback" inside a user gesture.
 * Older iOS: play a tiny silent <audio> on the same gesture (legacy media-channel unlock).
 * Safe no-op on non-WebKit browsers.
 */

type AudioSessionNavigator = Navigator & {
  audioSession?: { type: string };
};

const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAEYsAAAB3AQACABAAZGF0YQAAAAA=";

let legacyUnlockEl: HTMLAudioElement | null = null;

/** Synchronously claim the iOS media/playback session during a user gesture. */
export function unlockIosPlaybackSession(): void {
  try {
    const session = (navigator as AudioSessionNavigator).audioSession;
    if (session) session.type = "playback";
  } catch {
    // audioSession is Safari-only and may throw if unavailable mid-gesture
  }

  try {
    if (!legacyUnlockEl) {
      const el = document.createElement("audio");
      el.setAttribute("playsinline", "");
      el.setAttribute("webkit-playsinline", "");
      el.preload = "auto";
      el.loop = true;
      el.volume = 0.01;
      el.src = SILENT_WAV;
      el.style.display = "none";
      el.setAttribute("aria-hidden", "true");
      document.documentElement.appendChild(el);
      legacyUnlockEl = el;
    }
    void legacyUnlockEl.play().catch(() => {
      // Autoplay may still reject outside a gesture; Speak retries unlock.
    });
  } catch {
    // Legacy path is best-effort
  }
}

export function isLikelyIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && notChrome;
}
