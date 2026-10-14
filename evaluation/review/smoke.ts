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
  const distinctSpellings = new Set(snapshot.samples.map(sample => sample.spelling)).size;
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
      const seen = new Set<string>();
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
        seen.add((await page.locator("#word").textContent())!);
        if (position < 2) await page.getByLabel("Comment (optional)").fill(`Test comment ${index}/${position}`);
        if (position === 1) await page.getByRole("button", { name: "Skip — I can’t judge this" }).click();
        else {
          await page.getByRole("radio", { name: "Very much", exact: true }).check();
          if (position === 0) await page.getByRole("checkbox").check();
          await page.getByRole("button", { name: "Submit and next" }).click();
        }
      }
      await expect(page.getByRole("heading", { name: "Thank you. Your review is submitted." })).toBeVisible({ timeout: 30000 });
      let loseContinuation = index === 0;
      await context.route(`${url}/rest/v1/rpc/continue_review`, async route => {
        if (!loseContinuation) return route.continue();
        loseContinuation = false;
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        await route.abort("connectionreset");
      });
      await page.getByRole("button", { name: "Review more words" }).click();
      if (index === 0) {
        await expect(page.getByRole("button", { name: "Retry connection" })).toBeVisible();
        await page.reload();
      }
      const remaining = distinctSpellings - 20;
      for (let position = 0; position < remaining; position++) {
        await expect(page.locator("#progress")).toHaveText(`Word ${position + 1} of ${remaining}`);
        const spelling = (await page.locator("#word").textContent())!;
        expect(seen.has(spelling)).toBe(false);
        seen.add(spelling);
        await page.getByRole("radio", { name: "Very much", exact: true }).check();
        await page.getByRole("button", { name: "Submit and next" }).click();
      }
      await expect(page.getByRole("heading", { name: "Thank you. Your review is submitted." })).toBeVisible();
      await page.getByRole("button", { name: "Review more words" }).click();
      await expect(page.locator("#finished-title")).toHaveText("Thank you. You’ve reviewed every spelling in this study.");
      expect(seen.size).toBe(distinctSpellings);
      await context.close();
    }
    command("export", ["--study", id, "--out", resolve(directory, "export")]);
    command("report", ["--input", resolve(directory, "export/export.json"), "--out", resolve(directory, "summary")]);
    const exported: ReviewExport = JSON.parse(await readFile(resolve(directory, "export/export.json"), "utf8"));
    const report = buildReport(exported);
    expect(report.coverage.sessions_completed).toBe(4);
    expect(exported.responses).toHaveLength(distinctSpellings * 2);
    expect(new Set(exported.sessions.map(session => session.chain_id)).size).toBe(2);
    expect(exported.sessions.filter(session => session.previous_session_id)).toHaveLength(2);
    expect(JSON.stringify(exported)).not.toMatch(/token_hash|submission_token/);
    expect(exported.responses.filter(response => response.comment?.startsWith("Test comment"))).toHaveLength(4);
    expect(report.coverage.ratings).toBe(distinctSpellings * 2 - 2);
    expect(report.coverage.skips).toBe(2);
    expect(report.familiarity.flagged).toBe(2);
    expect(report.all.share_4_5).toBe(1);
    console.log(`Real browser → Supabase → owner CLI verified: 2 chains, 4 batches, ${exported.responses.length} responses, lost submission and continuation acknowledgements, and pool exhaustion. Artifacts: ${directory}`);
  } finally {
    await browser.close();
    await server.close();
    const exported = await owner.exportStudy(id);
    for (const session of exported.sessions) await owner.request(`review_responses?session_id=eq.${session.id}`, "DELETE");
    await owner.request(`review_studies?id=eq.${id}`, "DELETE");
  }
}

smoke().catch(error => { console.error(error instanceof Error ? error.message : "Local smoke test failed."); process.exitCode = 1; });
