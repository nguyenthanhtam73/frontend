import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";

// Load E2E env (optional). Prefer .env.e2e over process env already set in CI.
dotenv.config({ path: path.resolve(__dirname, ".env.e2e") });

const WEB_URL = process.env.E2E_WEB_URL || "http://localhost:3000";
const API_URL = process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default defineConfig({
  testDir: "./test/e2e",
  testMatch: "**/*.{test,spec}.ts",
  fullyParallel: false, // SePay smoke shares sandbox + avoids checkout races
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: WEB_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    extraHTTPHeaders: {
      Accept: "application/json",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Do not auto-start servers — both API + Next must already be running.
  // Documented in test/e2e/README-SMOKE.txt and .env.e2e.example.
  metadata: {
    apiURL: API_URL,
    webURL: WEB_URL,
  },
});
