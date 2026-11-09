#!/usr/bin/env node
/**
 * Record a short looping OG clip of the vocal capture page (Anatomy3D + Unglish mark).
 *
 *   node scripts/vocal-og/capture.mjs --serve
 */
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, copyFile, unlink, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outDir = path.join(root, "demo");
const tmpDir = path.join(root, "tmp/vocal-og");
const SIZE = 1080;
const RECORD_MS = 14_000;
const BASE = process.env.VOCAL_OG_URL || "http://127.0.0.1:5173/vocal-og-capture.html";

async function waitHttp(url, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok || res.status === 404) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function startVite() {
  const child = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", "5173", "--strictPort"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });
  const log = createWriteStream(path.join(tmpDir, "vite.log"));
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  return child;
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

async function main() {
  await mkdir(tmpDir, { recursive: true });
  await mkdir(outDir, { recursive: true });

  // Clear prior webm leftovers so we can find the new one.
  for (const name of await readdir(tmpDir)) {
    if (name.endsWith(".webm")) {
      try {
        await unlink(path.join(tmpDir, name));
      } catch {
        // ignore
      }
    }
  }

  const serve = process.argv.includes("--serve");
  let vite = null;
  if (serve) {
    vite = startVite();
    await waitHttp("http://127.0.0.1:5173/");
  } else {
    await waitHttp(BASE.replace(/vocal-og-capture\.html.*/, ""));
  }

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: [
      "--autoplay-policy=no-user-gesture-required",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--disable-extensions",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: SIZE, height: SIZE },
    deviceScaleFactor: 1,
    recordVideo: { dir: tmpDir, size: { width: SIZE, height: SIZE } },
    colorScheme: "light",
    // Keep media from being auto-paused.
    reducedMotion: "no-preference",
  });

  const page = await context.newPage();
  page.on("console", (msg) => console.log("[page]", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.error("[pageerror]", err));

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(
    () => document.documentElement.dataset.ogReady === "1" || !!document.documentElement.dataset.ogError,
    null,
    { timeout: 120_000 },
  );
  const err = await page.evaluate(() => document.documentElement.dataset.ogError || "");
  if (err) throw new Error(`Capture page failed: ${err}`);

  // Wait until speech is driving articulators (or soft-timeout).
  await page
    .waitForFunction(() => Number(document.documentElement.dataset.ogMotion || "0") > 8, null, {
      timeout: 12_000,
    })
    .catch(() => console.warn("motion soft-timeout; recording anyway"));

  const stats = await page.evaluate(() => ({ ...document.documentElement.dataset }));
  console.log("capture stats", stats);

  await page.waitForTimeout(RECORD_MS);

  const endStats = await page.evaluate(() => ({ ...document.documentElement.dataset }));
  console.log("end stats", endStats);

  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  const webmPath = await video.path();
  const rawMp4 = path.join(tmpDir, "raw.mp4");
  const finalMp4 = path.join(tmpDir, "vocal-og-loop.mp4");
  const poster = path.join(tmpDir, "vocal-og-poster.png");
  const scanDir = path.join(tmpDir, "scan");
  await mkdir(scanDir, { recursive: true });

  // Find first non-blank frame (Vite/boot + home tween leave a flat gray lead-in).
  await run("ffmpeg", ["-y", "-i", webmPath, "-t", "25", "-vf", "fps=2", path.join(scanDir, "s-%03d.png")]);
  const startSec = await firstContentSecond(scanDir);
  console.log("trim start", startSec, "s");

  // Encode H.264 high@4.0 for 1080²; silent track omitted.
  await run("ffmpeg", [
    "-y",
    "-ss",
    String(startSec),
    "-i",
    webmPath,
    "-t",
    "9",
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "high",
    "-level",
    "4.0",
    "-crf",
    "22",
    "-movflags",
    "+faststart",
    rawMp4,
  ]);

  await run("ffmpeg", [
    "-y",
    "-ss",
    String(startSec + 2.5),
    "-i",
    webmPath,
    "-update",
    "1",
    "-frames:v",
    "1",
    poster,
  ]);

  await copyFile(rawMp4, finalMp4);
  // Copy into demo/ only after Vite is stopped so HMR cannot reload mid-write.
  if (vite) {
    vite.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 500));
  }

  await copyFile(finalMp4, path.join(outDir, "vocal-og-loop.mp4"));
  await copyFile(poster, path.join(outDir, "vocal-og-poster.png"));
  console.log("Wrote", path.join(outDir, "vocal-og-loop.mp4"));
  console.log("Wrote", path.join(outDir, "vocal-og-poster.png"));
}

async function firstContentSecond(scanDir) {
  // Flat gray boot frames are tiny; the head mesh lands above ~50KB at 1080².
  const names = (await readdir(scanDir)).filter((n) => n.endsWith(".png")).sort();
  for (let i = 0; i < names.length; i++) {
    const { size } = await stat(path.join(scanDir, names[i]));
    if (size > 50_000) return i / 2;
  }
  return 2.5;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
