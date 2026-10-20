import { expect, test } from '@playwright/test';
import { entrar } from './util';

test('envio → análise → aprovação → publicação → mapa com supressão → retirada remove', async ({ page, browser, request }) => {
  test.setTimeout(150_000);
  // 1) Entidade A envia: bairro 01 com 30 atendimentos; bairro 02 com 3 (abaixo do limiar).
  await entrar(page, 'entidade-a@omv.test');
  await page.goto('/entidade/novo');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/Início do período/).fill('2026-05-01');
  await page.getByLabel(/Fim do período/).fill('2026-05-31');
  await page.getByRole('button', { name: 'Continuar' }).click();
  const preencher = async (bairro: string, qtd: string) => {
    const cartoes = page.locator('form, div').filter({ has: page.getByRole('heading', { name: /^Registro / }) });
    void cartoes;
    const n = await page.getByRole('heading', { name: /^Registro / }).count();
    const i = n - 1;
    await page.getByLabel(/^Bairro/).nth(i).selectOption({ label: bairro });
    await page.getByLabel(/^Categoria de violência/).nth(i).selectOption({ label: 'Violência psicológica' });
    await page.getByLabel(/^Faixa etária/).nth(i).selectOption({ label: '25 a 34 anos' });
    await page.getByLabel(/^Unidade de contagem/).nth(i).selectOption({ label: 'Atendimentos' });
    await page.getByLabel(/^Tipo de atendimento/).nth(i).selectOption({ label: 'Acolhimento' });
    await page.getByLabel(/^Quantidade/).nth(i).fill(qtd);
  };
  await preencher('Bairro demonstrativo 01', '30');
  await page.getByRole('button', { name: 'Novo registro' }).click();
  await preencher('Bairro demonstrativo 02', '3');
  await page.getByRole('button', { name: 'Revisar' }).click();
  await page.getByLabel(/Declaro que este envio/).check();
  await page.getByRole('button', { name: 'Enviar formulário' }).click();
  const protocolo = /OMV-\d{4}-\d{6}/.exec(await page.getByText(/Protocolo OMV-/).innerText())![0];

  // 2) Analista aprova.
  const ctxA = await browser.newContext();
  const pa = await ctxA.newPage();
  await entrar(pa, 'analista@omv.test');
  await pa.goto('/analise');
  await pa.getByRole('row', { name: new RegExp(protocolo) }).getByRole('link', { name: 'Analisar' }).click();
  await pa.waitForLoadState('networkidle');
  await pa.getByRole('button', { name: 'Iniciar análise' }).click();
  await expect(pa.getByRole('button', { name: 'Aprovar' })).toBeEnabled();
  await expect(async () => {
    await pa.getByRole('button', { name: 'Aprovar' }).click();
    await expect(pa.getByRole('button', { name: 'Confirmar' })).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 20_000 });
  await pa.getByRole('button', { name: 'Confirmar' }).click();
  await expect(pa.getByText('Aprovado').first()).toBeVisible();
  await ctxA.close();

  // 3) Antes de publicar, o público não vê esses dados reais.
  const antes = await (await request.get('/api/publico/indicadores?cubo=total&periodo=todos')).json();
  expect(antes.modo).not.toBe('real');

  // 4) Gestor gera e publica.
  const ctxG = await browser.newContext();
  const pg = await ctxG.newPage();
  await entrar(pg, 'gestor@omv.test');
  await pg.goto('/admin/publicacao');
  await pg.waitForLoadState('networkidle');
  await pg.getByRole('button', { name: 'Gerar publicação' }).click();
  await expect(pg.getByRole('button', { name: 'Publicar', exact: true })).toBeVisible();
  await expect(async () => {
    const b = pg.getByRole('button', { name: 'Publicar', exact: true });
    if (await b.count()) await b.click();
    await expect(pg.getByText('Publicada', { exact: true })).toBeVisible({ timeout: 2500 });
  }).toPass({ timeout: 30_000 });

  // 5) Visitante: o valor 3 está suprimido (e o bairro vizinho também, pela supressão complementar).
  const r = await (await request.get('/api/publico/indicadores?cubo=territorio&periodo=2026-05')).json();
  expect(r.modo).toBe('real');
  const b2 = r.celulas.find((c: { nome: string }) => c.nome === 'Bairro demonstrativo 02');
  expect(b2).toMatchObject({ suprimido: true, valor: null });
  expect(JSON.stringify(r)).not.toMatch(/"valor":3[,}]/);
  const total = await (await request.get('/api/publico/indicadores?cubo=total&periodo=2026-05')).json();
  expect(total.celulas[0].valor).toBe(33);

  // 6) Gestor retira o envio: a publicação é refeita e os dados saem do portal.
  await pg.goto('/analise');
  await pg.getByRole('row', { name: new RegExp(protocolo) }).getByRole('link', { name: 'Analisar' }).click();
  await pg.waitForLoadState('networkidle');
  await expect(async () => {
    await pg.getByRole('button', { name: 'Retirar da base analítica' }).click();
    await expect(pg.getByLabel(/Justificativa/)).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 20_000 });
  await pg.getByLabel(/Justificativa/).fill('Retirada de teste automatizado do fluxo completo.');
  await pg.getByRole('button', { name: 'Confirmar' }).click();
  await expect(pg.getByText('Retirado').first()).toBeVisible();
  const depois = await (await request.get('/api/publico/indicadores?cubo=total&periodo=2026-05')).json();
  expect(depois.modo).not.toBe('real');
  await ctxG.close();
});
