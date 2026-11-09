/**
 * Vanilla mount for Chimera's Anatomy3D head on the Unglish vocal demo.
 * No React/Zustand: drives the head from AudioEngine.latest + a main-thread VoiceModel.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Anatomy3D } from "./render/anatomy3d.ts";
import { DEFAULT_VIEW } from "./render/anatomy.ts";
import { VoiceModel } from "./analysis.ts";
import { sameBody, type BodyMix } from "./body.ts";
import { clearCss, clearHex, syncTheme } from "./colors.ts";
import { NEUTRAL } from "../wasm/engine.ts";
import type { AudioEngine } from "../audio/AudioEngine.ts";

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export type HeadHandle = {
  setBody(body: BodyMix, sampleRate: number): void;
  dispose(): void;
};

/**
 * Mount the interactive 3D head into `wrap` (needs position:relative and a size).
 * Returns a handle to rebuild the VoiceModel when the voice body changes.
 */
export function mountHead(wrap: HTMLElement, engine: AudioEngine, initialBody: BodyMix): HeadHandle {
  syncTheme();
  const canvas = document.createElement("canvas");
  canvas.setAttribute(
    "aria-label",
    "Chimera 3D vocal head. Drag to turn, scroll or pinch to zoom, double-click to reset view.",
  );
  canvas.setAttribute("role", "img");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.touchAction = "none";
  wrap.appendChild(canvas);

  const glCanvas = document.createElement("canvas");
  let gl: THREE.WebGLRenderer;
  try {
    gl = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch {
    wrap.textContent = "3D head needs WebGL in this browser.";
    wrap.classList.add("head-failed");
    return { setBody() {}, dispose() {} };
  }
  gl.outputColorSpace = THREE.LinearSRGBColorSpace;
  gl.setClearColor(clearHex, 1);

  const r = new Anatomy3D();
  r.centred = true;
  r.facing = 1;
  const camera = r.camera;
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.8;
  controls.screenSpacePanning = true;
  controls.minDistance = 20;
  controls.maxDistance = 220;

  const tween = {
    on: false,
    t: 0,
    dur: 1,
    p0: new THREE.Vector3(),
    q0: new THREE.Vector3(),
    p1: new THREE.Vector3(),
    q1: new THREE.Vector3(),
  };
  const s0 = new THREE.Spherical(),
    s1 = new THREE.Spherical(),
    off = new THREE.Vector3();
  const moveTo = (pos: THREE.Vector3, target: THREE.Vector3, dur: number) => {
    tween.p0.copy(camera.position);
    tween.q0.copy(controls.target);
    tween.p1.copy(pos);
    tween.q1.copy(target);
    tween.t = 0;
    tween.dur = dur;
    tween.on = true;
  };
  const stepTween = (dt: number) => {
    if (!tween.on) return;
    tween.t = Math.min(1, tween.t + dt / tween.dur);
    const e = ease(tween.t);
    s0.setFromVector3(off.copy(tween.p0).sub(tween.q0));
    s1.setFromVector3(off.copy(tween.p1).sub(tween.q1));
    let dth = s1.theta - s0.theta;
    dth -= Math.round(dth / (2 * Math.PI)) * 2 * Math.PI;
    s0.set(s0.radius + (s1.radius - s0.radius) * e, s0.phi + (s1.phi - s0.phi) * e, s0.theta + dth * e);
    controls.target.lerpVectors(tween.q0, tween.q1, e);
    camera.position.copy(controls.target).add(off.setFromSpherical(s0));
    if (tween.t >= 1) tween.on = false;
  };
  controls.addEventListener("start", () => {
    tween.on = false;
  });

  let model: VoiceModel | null = new VoiceModel(initialBody, engine.sampleRate || 48000);
  let posed: VoiceModel | null = null;
  const posedTarget = new THREE.Vector3();
  const home = () => {
    if (!model) return;
    const p = r.poses(model);
    moveTo(p.home, p.target, 0.9);
  };
  canvas.addEventListener("dblclick", home);

  let w = 0,
    h = 0,
    dpr = 1;
  const maxDpr = () => Math.min(2, window.devicePixelRatio || 1);
  let refit = false;
  const fit = () => {
    const b = wrap.getBoundingClientRect();
    dpr = maxDpr();
    refit = b.width !== w || b.height !== h;
    w = b.width;
    h = b.height;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    gl.setPixelRatio(dpr);
    gl.setSize(Math.max(1, w), Math.max(1, h), false);
    r.resize(Math.max(1, w), Math.max(1, h));
  };
  const ro = new ResizeObserver(fit);
  ro.observe(wrap);
  fit();

  const applyTheme = () => {
    syncTheme();
    gl.setClearColor(clearHex, 1);
    const fog = r.scene.fog;
    if (fog instanceof THREE.Fog) fog.color.set(clearHex);
    wrap.style.background = clearCss;
  };
  applyTheme();
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const onScheme = () => applyTheme();
  mq.addEventListener("change", onScheme);

  const ctx2d = canvas.getContext("2d")!;
  let raf = 0;
  let last = performance.now();
  const view = { ...DEFAULT_VIEW };
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    const elapsed = Math.min(0.5, (now - last) / 1000);
    last = now;
    if (maxDpr() !== dpr) fit();

    const tele =
      engine.latest && model && sameBody(engine.latest.body, model.body) ? engine.latest : null;
    const a = tele ? VoiceModel.articFromArray(tele.t.artic) : { ...NEUTRAL };
    r.face.update(tele, elapsed);

    const m = model;
    if (m && w > 0 && h > 0) {
      if (posed !== m) {
        const p = r.poses(m);
        if (!posed) {
          camera.position.copy(p.side);
          controls.target.copy(p.target);
          moveTo(p.home, p.target, 1.6);
        } else {
          off.copy(p.target).sub(posedTarget);
          camera.position.add(off);
          controls.target.add(off);
        }
        posedTarget.copy(p.target);
        posed = m;
      } else if (refit) {
        const p = r.poses(m);
        moveTo(p.home, p.target, 0.4);
      }
      refit = false;
      stepTween(dt);
      controls.update(dt);
      const f = m.frame(a);
      r.update(m, f, a, tele, view, dt);
      gl.render(r.scene, camera);
      ctx2d.setTransform(1, 0, 0, 1, 0, 0);
      ctx2d.globalCompositeOperation = "source-over";
      ctx2d.fillStyle = clearCss;
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);
      ctx2d.drawImage(glCanvas, 0, 0, canvas.width, canvas.height);
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    setBody(body: BodyMix, sampleRate: number) {
      if (model && sameBody(model.body, body) && model) return;
      model?.dispose();
      model = new VoiceModel(body, sampleRate || engine.sampleRate || 48000);
      // posed stays so the camera recentres smoothly onto the new body
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mq.removeEventListener("change", onScheme);
      canvas.removeEventListener("dblclick", home);
      controls.dispose();
      r.dispose();
      model?.dispose();
      model = null;
      gl.dispose();
      gl.forceContextLoss();
      canvas.remove();
    },
  };
}
