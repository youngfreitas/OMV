import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('mapa: seleção por teclado, painel lateral e tabela equivalente', async ({ page }) => {
  await page.goto('/mapa');
  await page.waitForLoadState('networkidle');
  const area = page.getByRole('button', { name: /Célula demonstrativa/ }).first();
  await area.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 2 }).filter({ hasText: 'Célula demonstrativa' })).toBeVisible();
  await page.getByRole('tab', { name: 'Tabela' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByLabel('Ver por').selectOption('categoria');
  await expect(page.getByText('Violência psicológica').first()).toBeVisible();
});

for (const [rota, tema] of [['/', 'light'], ['/mapa', 'light'], ['/entrar', 'light'], ['/', 'dark'], ['/mapa', 'dark'], ['/entrar', 'dark']] as const) {
  test(`acessibilidade (axe, WCAG 2.1 AA) em ${rota} (${tema})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: tema });
    await page.goto(rota);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500); // fim das animações
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
}
