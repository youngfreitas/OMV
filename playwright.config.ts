import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const executablePath = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome']
  .find((p) => existsSync(p));

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3100',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions: executablePath ? { executablePath } : {} } }],
  webServer: {
    command: 'pnpm exec next dev -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      OMV_MODO_DEMO: 'true',
      DATABASE_URL: process.env.DATABASE_URL_TESTE ?? 'postgres://omv:omv@localhost:5432/omv_test',
    },
  },
});
