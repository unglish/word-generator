#!/usr/bin/env node
/**
 * Record a short looping OG clip of the vocal capture page (Anatomy3D + Unglish mark),
 * and/or capture the 1200×630 Open Graph poster with conversion copy.
 *
 *   node scripts/vocal-og/capture.mjs --serve
 *   node scripts/vocal-og/capture.mjs --serve --poster-only
 */
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, copyFile, unlink, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outDir = path.join(root, "demo");
const tmpDir = path.join(root, "tmp/vocal-og");
const VIDEO_SIZE = 1080;
const POSTER_W = 1200;
const POSTER_H = 630;
const RECORD_MS = 14_000;
const BASE = process.env.VOCAL_OG_URL || "http://127.0.0.1:5173/vocal-og-capture.html";
const posterOnly = process.argv.includes("--poster-only");

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

function chromeArgs() {
  return [
    "--autoplay-policy=no-user-gesture-required",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--disable-extensions",
  ];
}

async function waitCaptureReady(page) {
  page.on("console", (msg) => console.log("[page]", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.error("[pageerror]", err));

  await page.waitForFunction(
    () => document.documentElement.dataset.ogReady === "1" || !!document.documentElement.dataset.ogError,
    null,
    { timeout: 120_000 },
  );
  const err = await page.evaluate(() => document.documentElement.dataset.ogError || "");
  if (err) throw new Error(`Capture page failed: ${err}`);

  await page
    .waitForFunction(() => Number(document.documentElement.dataset.ogMotion || "0") > 8, null, {
      timeout: 12_000,
    })
    .catch(() => console.warn("motion soft-timeout; capturing anyway"));
}

async function capturePoster(browser) {
  const posterUrl = BASE.includes("?") ? `${BASE}&mode=poster` : `${BASE}?mode=poster`;
  const context = await browser.newContext({
    viewport: { width: POSTER_W, height: POSTER_H },
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  await page.goto(posterUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await waitCaptureReady(page);

  // Let articulators settle into a readable mid-phrase pose.
  await page.waitForTimeout(2_400);

  const stats = await page.evaluate(() => ({ ...document.documentElement.dataset }));
  console.log("poster stats", stats);

  // Playwright's page.screenshot can hang on an animating WebGL canvas;
  // CDP Page.captureScreenshot is reliable with SwiftShader.
  const poster = path.join(tmpDir, "vocal-og-poster.png");
  const client = await context.newCDPSession(page);
  const { data } = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  await writeFile(poster, Buffer.from(data, "base64"));

  await page.close();
  await context.close();
  return poster;
}

async function captureVideo(browser) {
  const context = await browser.newContext({
    viewport: { width: VIDEO_SIZE, height: VIDEO_SIZE },
    deviceScaleFactor: 1,
    recordVideo: { dir: tmpDir, size: { width: VIDEO_SIZE, height: VIDEO_SIZE } },
    colorScheme: "light",
    reducedMotion: "no-preference",
  });

  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await waitCaptureReady(page);

  const stats = await page.evaluate(() => ({ ...document.documentElement.dataset }));
  console.log("capture stats", stats);

  await page.waitForTimeout(RECORD_MS);

  const endStats = await page.evaluate(() => ({ ...document.documentElement.dataset }));
  console.log("end stats", endStats);

  const video = page.video();
  await page.close();
  await context.close();

  const webmPath = await video.path();
  const rawMp4 = path.join(tmpDir, "raw.mp4");
  const finalMp4 = path.join(tmpDir, "vocal-og-loop.mp4");
  const scanDir = path.join(tmpDir, "scan");
  await mkdir(scanDir, { recursive: true });

  await run("ffmpeg", ["-y", "-i", webmPath, "-t", "25", "-vf", "fps=2", path.join(scanDir, "s-%03d.png")]);
  const startSec = await firstContentSecond(scanDir);
  console.log("trim start", startSec, "s");

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

  await copyFile(rawMp4, finalMp4);
  return finalMp4;
}

async function main() {
  await mkdir(tmpDir, { recursive: true });
  await mkdir(outDir, { recursive: true });

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
    args: chromeArgs(),
  });

  try {
    const posterPath = await capturePoster(browser);
    let videoPath = null;
    if (!posterOnly) {
      videoPath = await captureVideo(browser);
    }

    // Stop Vite before writing demo/ so HMR cannot reload mid-write.
    if (vite) {
      vite.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 500));
      vite = null;
    }

    if (videoPath) {
      await copyFile(videoPath, path.join(outDir, "vocal-og-loop.mp4"));
      console.log("Wrote", path.join(outDir, "vocal-og-loop.mp4"));
    }
    await copyFile(posterPath, path.join(outDir, "vocal-og-poster.png"));
    console.log("Wrote", path.join(outDir, "vocal-og-poster.png"));
  } finally {
    if (vite) {
      vite.kill("SIGTERM");
      vite = null;
    }
    // browser.close can hang after WebGL capture; don't block the write path.
    await Promise.race([
      browser.close().catch(() => {}),
      new Promise((r) => setTimeout(r, 3_000)),
    ]);
  }
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
