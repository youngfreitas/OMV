import { expect, test } from '@playwright/test';
import { entrar } from './util';

async function enviarComoEntidade(page: import('@playwright/test').Page) {
  await entrar(page, 'entidade-a@omv.test');
  await page.goto('/entidade/novo');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/Início do período/).fill('2026-04-01');
  await page.getByLabel(/Fim do período/).fill('2026-04-30');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel(/^Bairro/).selectOption({ label: 'Bairro demonstrativo 03' });
  await page.getByLabel(/^Categoria de violência/).selectOption({ label: 'Violência física' });
  await page.getByLabel(/^Faixa etária/).selectOption({ label: '35 a 44 anos' });
  await page.getByLabel(/^Unidade de contagem/).selectOption({ label: 'Atendimentos' });
  await page.getByLabel(/^Tipo de atendimento/).selectOption({ label: 'Orientação jurídica' });
  await page.getByLabel(/^Quantidade/).fill('9');
  await page.getByRole('button', { name: 'Revisar' }).click();
  await page.getByLabel(/Declaro que este envio/).check();
  await page.getByRole('button', { name: 'Enviar formulário' }).click();
  const txt = await page.getByText(/Protocolo OMV-\d{4}-\d{6}/).innerText();
  return /OMV-\d{4}-\d{6}/.exec(txt)![0];
}

test('analista recebe, devolve com justificativa e depois aprova', async ({ page, browser }) => {
  const protocolo = await enviarComoEntidade(page);
  const ctx = await browser.newContext();
  const pa = await ctx.newPage();
  await entrar(pa, 'analista@omv.test');
  await pa.goto('/analise');
  await expect(pa.getByText(protocolo)).toBeVisible();
  await pa.getByRole('row', { name: new RegExp(protocolo) }).getByRole('link', { name: 'Analisar' }).click();
  await pa.waitForLoadState('networkidle');
  await pa.getByRole('button', { name: 'Iniciar análise' }).click();
  await expect(pa.getByText('Em análise').first()).toBeVisible();
  await expect(async () => {
    await pa.getByRole('button', { name: 'Devolver para correção' }).click();
    await expect(pa.getByLabel(/Justificativa/)).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 20_000 });
  await pa.getByLabel(/Justificativa/).fill('Conferir o total informado para o bairro.');
  await pa.getByRole('button', { name: 'Confirmar' }).click();
  await expect(pa.getByText('Pendente de correção').first()).toBeVisible();

  // Entidade vê a devolução e a notificação
  await page.goto('/notificacoes');
  await expect(page.getByText(/correção solicitada/)).toBeVisible();
  await ctx.close();
});
