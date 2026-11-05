import { defineConfig } from '@playwright/test';

// Regression tests drive the built game through window.__game.
export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173/', viewport: { width: 1280, height: 760 } },
  webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:4173/', reuseExistingServer: true, timeout: 120_000 },
});
