import { test, expect } from "@playwright/test";
test("production assets load under a Pages subpath in main thread and module worker", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/word-generator/repair-pilot.html");
  const result = page.locator("#result");
  await expect(result).toHaveAttribute("data-status", "passed", { timeout: 110000 });
  const report = JSON.parse(await result.textContent() ?? "{}");
  expect(report.main.fixtures).toBe(488);
  expect(report.main.words).toBe(3456);
  expect(report.main.adapterAssertions).toBe(32);
  expect(report.worker).toEqual(report.main);
  expect(report.repeated).toEqual(report.main);
  expect(errors).toEqual([]);
});

test("existing classic importScripts workers still load the standalone library", async ({ page }) => {
  await page.goto("/word-generator/repair-pilot.html");
  const word = await page.evaluate(async () => {
    const library = new URL("unglish-worker.js", location.href).href;
    const blob = new Blob([`importScripts(${JSON.stringify(library)});postMessage(self.unglish.generateWord({seed:342}).written.clean);`], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    try {
      return await new Promise<string>((resolve, reject) => {
        worker.onmessage = event => resolve(event.data);
        worker.onerror = event => reject(new Error(event.message));
      });
    } finally { worker.terminate(); URL.revokeObjectURL(url); }
  });
  expect(word).toMatch(/^[a-z]+$/);
});
