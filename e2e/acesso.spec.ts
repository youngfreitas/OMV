import { expect, test } from '@playwright/test';
import { entrar } from './util';

test('visitante acessa só / e /mapa; rotas internas redirecionam; APIs privadas dão 401', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Observatório Municipal de Violência');
  for (const rota of ['/painel', '/analise', '/dashboard', '/admin/usuarios', '/entidade/envios']) {
    await page.goto(rota);
    await expect(page).toHaveURL(/\/entrar$/);
  }
  for (const api of ['/api/modelos/csv', '/api/relatorios', '/api/importacao']) {
    const r = await request.get(api);
    expect(r.status()).toBe(401);
  }
});

test('login com MFA (analista) e bloqueio de página administrativa', async ({ page }) => {
  await entrar(page, 'analista@omv.test');
  await expect(page.getByText('Fila de análise').first()).toBeVisible();
  await page.goto('/admin/usuarios');
  await expect(page).toHaveURL(/acesso-negado/);
});

test('senha incorreta mostra erro genérico', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('admin@omv.test');
  await page.getByLabel('Senha').fill('errada');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible();
});
