import { defineConfig } from '@playwright/test';

/**
 * Browser E2E for the REACH product.
 *
 * Servers are NOT started by Playwright — boot the full stack first:
 *
 *   RUN_E2E=1 ./scripts/launch.sh
 *
 * launch.sh starts the backend (mock mode, port 8000) and serves the built
 * web app on port 5173, then drives this browser test against it.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});