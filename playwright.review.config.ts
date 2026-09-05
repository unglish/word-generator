import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "evaluation/review/browser",
  fullyParallel: true,
  timeout: 30000,
  retries: 0,
  use: { baseURL: "http://127.0.0.1:4174", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: "npx vite --host 127.0.0.1 --port 4174 --strictPort",
    url: "http://127.0.0.1:4174/review.html",
    reuseExistingServer: false,
    env: {
      VITE_REVIEW_SUPABASE_URL: "https://review.test",
      VITE_REVIEW_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_browser_test",
      VITE_REVIEW_STUDY_ID: "written-v2-baseline",
    },
  },
});
