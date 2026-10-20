import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': src,
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    globalSetup: ['tests/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL_UNIT ?? 'postgres://omv:omv@localhost:5432/omv_test_unit',
      OMV_CHAVE_CIFRA: Buffer.from('teste-chave-32-bytes-omv-0000000').toString('base64'),
      OMV_SEGREDO_APP: 'segredo-de-teste-omv',
    },
  },
});
