/* Gera src/styles/tokens.css a partir de design/tokens.json (design system OMV). */
import { readFileSync, writeFileSync } from 'node:fs';

type Tok = { name: string; value: string | { light: string; dark: string } };
const j = JSON.parse(readFileSync('design/tokens.json', 'utf8'));

const colors: Tok[] = j.color.tokens;
const shadows: Tok[] = j.shadow.tokens;

function resolve(v: string, tema: 'light' | 'dark'): string {
  const m = /^\{(.+)\}$/.exec(v);
  if (!m) return v;
  const alvo = colors.find((c) => c.name === m[1]);
  if (!alvo) throw new Error(`Token inexistente: ${v}`);
  const val = alvo.value;
  return resolve(typeof val === 'string' ? val : val[tema], tema);
}

function bloco(tema: 'light' | 'dark', indent: string): string {
  const linhas: string[] = [];
  for (const c of colors) {
    const v = typeof c.value === 'string' ? c.value : c.value[tema];
    linhas.push(`${indent}--${c.name}: ${resolve(v, tema)};`);
  }
  for (const s of shadows) {
    const v = typeof s.value === 'string' ? s.value : s.value[tema];
    linhas.push(`${indent}--${s.name}: ${v};`);
  }
  return linhas.join('\n');
}

const fixos: string[] = [];
for (const t of j.spacing.tokens) fixos.push(`  --${t.name}: ${t.value};`);
for (const t of j.radius.tokens) fixos.push(`  --${t.name}: ${t.value};`);
for (const g of j.type.groups) {
  for (const s of g.styles) {
    fixos.push(`  --t-${s.name}-size: ${s.fontSize};`);
    fixos.push(`  --t-${s.name}-lh: ${s.lineHeight};`);
    fixos.push(`  --t-${s.name}-peso: ${s.fontWeight};`);
    if (s.letterSpacing) fixos.push(`  --t-${s.name}-ls: ${s.letterSpacing};`);
  }
}

const css = `/* GERADO por scripts/gerar-tokens.ts a partir de design/tokens.json — não edite à mão. */
:root {
  color-scheme: light;
  --font-display: "Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-sans: "Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
${fixos.join('\n')}
${bloco('light', '  ')}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
${bloco('dark', '    ')}
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
${bloco('dark', '  ')}
}
`;
writeFileSync('src/styles/tokens.css', css);
console.log('tokens.css gerado');
