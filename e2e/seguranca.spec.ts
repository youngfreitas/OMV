import { expect, test } from '@playwright/test';

test('cabeçalhos de segurança presentes', async ({ request }) => {
  const r = await request.get('/');
  const h = r.headers();
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['content-security-policy']).toContain("default-src 'self'");
  expect(h['strict-transport-security']).toContain('max-age=');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['referrer-policy']).toBeTruthy();
  expect(h['x-powered-by']).toBeUndefined();
});

test('API pública responde sem login e não expõe dados internos; APIs privadas bloqueiam', async ({ request }) => {
  const pub = await request.get('/api/publico/indicadores?cubo=territorio');
  expect(pub.status()).toBe(200);
  const j = await pub.json();
  expect(Object.keys(j)).not.toContain('registros');
  const txt = JSON.stringify(j);
  expect(txt).not.toMatch(/entidade|protocolo|usuario|senha/i);
  for (const [metodo, rota] of [['get', '/api/relatorios?formato=pdf'], ['post', '/api/importacao'], ['get', '/api/modelos/xlsx']] as const) {
    const r = await request[metodo](rota);
    expect(r.status(), rota).toBe(401);
  }
});

test('combinação de filtros não pré-computada devolve mensagem institucional', async ({ request }) => {
  const r = await request.get('/api/publico/indicadores?cubo=territorio&categoria=fisica');
  const j = await r.json();
  expect(j.disponivel).toBe(false);
  expect(j.mensagem).toBe('Dados indisponíveis para divulgação nesta combinação de filtros.');
});

test('cookie de sessão é httpOnly e SameSite=Lax', async ({ page, context }) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('entidade-a@omv.test');
  await page.getByLabel('Senha').fill('Senha-Teste-E2E-1!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/painel/);
  const c = (await context.cookies()).find((x) => x.name === 'omv_sessao')!;
  expect(c.httpOnly).toBe(true);
  expect(c.sameSite).toBe('Lax');
});
