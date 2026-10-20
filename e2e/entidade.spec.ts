import { expect, test } from '@playwright/test';
import { entrar } from './util';

test('entidade A cria envio pelo formulário, envia e a entidade B não o enxerga', async ({ page, browser }) => {
  await entrar(page, 'entidade-a@omv.test');
  await page.goto('/entidade/novo');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/Início do período/).fill('2026-03-01');
  await page.getByLabel(/Fim do período/).fill('2026-03-31');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel(/^Bairro/).selectOption({ label: 'Bairro demonstrativo 01' });
  await page.getByLabel(/^Categoria de violência/).selectOption({ label: 'Violência psicológica' });
  await page.getByLabel(/^Faixa etária/).selectOption({ label: '25 a 34 anos' });
  await page.getByLabel(/^Unidade de contagem/).selectOption({ label: 'Atendimentos' });
  await page.getByLabel(/^Tipo de atendimento/).selectOption({ label: 'Acolhimento' });
  await page.getByLabel(/^Quantidade/).fill('12');
  await page.getByRole('button', { name: 'Revisar' }).click();
  await expect(page.getByText('Nenhum problema encontrado.')).toBeVisible();
  await page.getByLabel(/Declaro que este envio/).check();
  await page.getByRole('button', { name: 'Enviar formulário' }).click();
  await expect(page.getByText(/Protocolo OMV-\d{4}-\d{6}/)).toBeVisible();
  await page.getByRole('button', { name: 'Ver meus envios' }).click();
  await page.getByRole('link', { name: 'Abrir' }).first().click();
  const url = page.url();
  expect(url).toMatch(/\/entidade\/envios\/[0-9a-f-]{36}$/);

  const ctxB = await browser.newContext();
  const pb = await ctxB.newPage();
  await entrar(pb, 'entidade-b@omv.test');
  const r = await pb.goto(url);
  expect(r?.status()).toBe(404);
  await pb.goto('/entidade/envios');
  await expect(pb.getByText('Nenhum envio ainda')).toBeVisible();
  await ctxB.close();
});

test('importação CSV cria rascunho; dado pessoal marca como restrito sem reproduzir o conteúdo', async ({ page }) => {
  await entrar(page, 'entidade-a@omv.test');
  await page.goto('/entidade/importar');
  await page.waitForLoadState('networkidle');
  const csv = [
    '#omv-modelo;OMV-MULHERES;1.0.0',
    'periodo_inicio;periodo_fim;bairro;tipo_registro;unidade_contagem;categoria_violencia;faixa_etaria;tipo_atendimento;canal_entrada;relacao_autor;situacao_atendimento;quantidade;observacao',
    '01/03/2026;31/03/2026;Bairro demonstrativo 02;atendimento_servico;atendimento;fisica;18_24;acolhimento;;;;7;Ligar para (12) 99876-5432',
  ].join('\r\n');
  await page.locator('input[type=file]').setInputFiles({ name: 'envio.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(async () => {
    await page.getByRole('button', { name: 'Verificar arquivo' }).click();
    await expect(page.getByText('Possível dado pessoal detectado').first()).toBeVisible({ timeout: 4000 });
  }).toPass({ timeout: 30_000 });
  await expect(page.getByText('99876')).toHaveCount(0);
  await page.getByRole('link', { name: /Revisar rascunho/ }).click();
  await expect(page.getByText('99876')).toHaveCount(0);
  await expect(page.getByText('Restrito').first()).toBeVisible();
});

test('arquivo malicioso é recusado na API', async ({ page }) => {
  await entrar(page, 'entidade-a@omv.test');
  await page.goto('/entidade/importar');
  await page.locator('input[type=file]').setInputFiles({ name: 'falso.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('%PDF-1.7 conteudo') });
  await page.getByRole('button', { name: 'Verificar arquivo' }).click();
  await expect(page.getByText('Arquivo não aceito')).toBeVisible();
});
