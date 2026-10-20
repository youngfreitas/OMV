import { expect, type Page } from '@playwright/test';
import { generateSync } from 'otplib';
import { readFileSync } from 'node:fs';

export const SENHA = 'Senha-Teste-E2E-1!';

export function segredoMfa(email: string): string | null {
  return JSON.parse(readFileSync('e2e/.estado.json', 'utf8'))[email] ?? null;
}

export async function entrar(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  const seg = segredoMfa(email);
  if (seg) {
    await page.getByLabel(/Código de 6 dígitos/).fill(generateSync({ secret: seg }));
    await page.getByRole('button', { name: 'Verificar' }).click();
  }
  await expect(page).toHaveURL(/\/painel/);
}
