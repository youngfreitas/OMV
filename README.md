# OMV — Observatório Municipal de Violência de Ubatuba

Plataforma de monitoramento **agregado** da violência doméstica contra mulheres em Ubatuba, vinculada à Secretaria Municipal de Defesa dos Direitos da Mulher e da Pessoa com Deficiência. **Nenhum dado pessoal da pessoa atendida é coletado.**

- Portal público (`/`, `/mapa`) com indicadores protegidos por supressão estatística.
- Área das entidades: formulário multietapas e importação (CSV/XLSX/DOCX/MD) com validação e detecção de dado pessoal.
- Análise, aprovação, publicação, dashboard, monitoramento, relatórios PDF/XLSX, cadastros, base geográfica e auditoria.

Stack: Next.js 15 · React 19 · TypeScript · PostgreSQL 16 + Drizzle · autenticação própria com MFA · Recharts · d3-geo.

## Começando

```bash
cp .env.example .env && docker compose up -d db
pnpm install && pnpm db:migrate && pnpm db:seed:dev
OMV_MODO_DEMO=true pnpm dev
```

Verificação: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e`.

## Documentação

[`docs/`](./docs): PLANEJAMENTO · ARQUITETURA · PERMISSOES · FLUXOS · METODOLOGIA · LGPD · INSTALACAO · DICIONARIO-DE-DADOS · PENDENCIAS-INSTITUCIONAIS · PLANO-BASE-TERRITORIAL.

Design: tokens e componentes do design system “OMV” (`design/tokens.json` → `src/styles/tokens.css`; componentes em `src/components/ds`). Logos oficiais em `public/marca/` — nunca redesenhar.
