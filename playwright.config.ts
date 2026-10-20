import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const executablePath = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome']
  .find((p) => existsSync(p));

// Ambiente de TESTE (valores fixos, só para o banco omv_test).
const ambiente = {
  OMV_MODO_DEMO: 'true',
  DATABASE_URL: process.env.DATABASE_URL_TESTE ?? 'postgres://omv:omv@localhost:5432/omv_test',
  OMV_CHAVE_CIFRA: 'dGVzdGUtY2hhdmUtMzItYnl0ZXMtb212LTAwMDAwMDA=',
  OMV_SEGREDO_APP: 'segredo-de-teste-omv',
  OMV_SESSAO_OCIOSA_MIN: '30',
};
Object.assign(process.env, ambiente);

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
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
    env: ambiente,
  },
});
