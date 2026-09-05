import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createServer } from "vite";
import { chromium, expect } from "@playwright/test";
import { localEnvironment } from "./local-environment.js";
import { freezeStudy } from "./snapshot.js";
import { OwnerApi } from "./owner-api.js";
import type { ReviewExport } from "./model.js";
import { buildReport } from "./report.js";

async function smoke(): Promise<void> {
  const { url, secret, publishable } = localEnvironment();
  const id = `test-smoke-${randomUUID()}`;
  const directory = resolve("review-exports", id);
  await mkdir(directory, { recursive: true });
  const snapshot = await freezeStudy(process.cwd(), id, 20260904, 25);
  const snapshotPath = resolve(directory, "snapshot.json");
  await writeFile(snapshotPath, JSON.stringify(snapshot));
  const owner = new OwnerApi(url, secret);
  function command(name: string, args: string[]): void {
    const result = spawnSync(process.execPath, ["--import", "tsx", "evaluation/review/cli.ts", name, ...args], {
      encoding: "utf8", env: { ...process.env, SUPABASE_URL: url, SUPABASE_SECRET_KEY: secret },
    });
    if (result.status !== 0) throw new Error(`Owner ${name} command failed: ${result.stderr}`);
  }
  command("import", ["--file", snapshotPath]);
  Object.assign(process.env, { VITE_REVIEW_SUPABASE_URL: url, VITE_REVIEW_SUPABASE_PUBLISHABLE_KEY: publishable, VITE_REVIEW_STUDY_ID: id });
  const server = await createServer({ server: { host: "127.0.0.1", port: 4175, strictPort: true }, clearScreen: false });
  const browser = await chromium.launch();
  try {
    await server.listen();
    for (let index = 0; index < 2; index++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      let loseAck = index === 0;
      await context.route(`${url}/rest/v1/rpc/submit_review_response`, async route => {
        if (!loseAck) return route.continue();
        loseAck = false;
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        await route.abort("connectionreset");
      });
      await page.goto("http://127.0.0.1:4175/review.html");
      await page.getByRole("button", { name: "Start reviewing" }).click();
      for (let position = 0; position < 20; position++) {
        await expect(page.locator("#progress")).toHaveText(`Word ${position + 1} of 20`);
        if (position < 2) await page.getByLabel("Comment (optional)").fill(`Test comment ${index}/${position}`);
        if (position === 1) await page.getByRole("button", { name: "Skip — I can’t judge this" }).click();
        else {
          await page.getByRole("radio", { name: "Very much", exact: true }).check();
          if (position === 0) await page.getByRole("checkbox").check();
          await page.getByRole("button", { name: "Submit and next" }).click();
        }
      }
      await expect(page.getByRole("heading", { name: "Thank you. Your review is submitted." })).toBeVisible({ timeout: 30000 });
      await context.close();
    }
    command("export", ["--study", id, "--out", resolve(directory, "export")]);
    command("report", ["--input", resolve(directory, "export/export.json"), "--out", resolve(directory, "summary")]);
    const exported: ReviewExport = JSON.parse(await readFile(resolve(directory, "export/export.json"), "utf8"));
    const report = buildReport(exported);
    expect(report.coverage.sessions_completed).toBe(2);
    expect(exported.responses).toHaveLength(40);
    expect(exported.responses.filter(response => response.comment?.startsWith("Test comment"))).toHaveLength(4);
    expect(report.coverage.ratings).toBe(38);
    expect(report.coverage.skips).toBe(2);
    expect(report.familiarity.flagged).toBe(2);
    expect(report.all.share_4_5).toBe(1);
    console.log(`Real browser → Supabase → owner CLI verified: 2 sessions, 40 responses, including a lost acknowledgement. Artifacts: ${directory}`);
  } finally {
    await browser.close();
    await server.close();
    const exported = await owner.exportStudy(id);
    for (const session of exported.sessions) await owner.request(`review_responses?session_id=eq.${session.id}`, "DELETE");
    await owner.request(`review_studies?id=eq.${id}`, "DELETE");
  }
}

smoke().catch(error => { console.error(error instanceof Error ? error.message : "Local smoke test failed."); process.exitCode = 1; });
