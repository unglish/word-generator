import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "evaluation/repair-pilot/browser",
  timeout: 120000,
  use: {
    baseURL: "http://127.0.0.1:4175", trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
  },
  webServer: {
    command: "node evaluation/repair-pilot/serve.mjs",
    url: "http://127.0.0.1:4175/word-generator/repair-pilot.html",
    reuseExistingServer: false,
  },
});
