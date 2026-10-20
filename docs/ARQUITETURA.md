# Arquitetura

## Stack

- **Next.js 15 (App Router) + React 19 + TypeScript estrito**, gerenciador `pnpm`.
- **PostgreSQL 16** com **Drizzle ORM**; migrações SQL versionadas em `db/migrations` (aplicadas por `scripts/migrar.ts`).
- **Autenticação própria**: argon2id (`@node-rs/argon2`); sessão opaca (token aleatório de 256 bits, **só o hash SHA-256 no banco**)
  em cookie `httpOnly; Secure; SameSite=Lax`; expiração ociosa e absoluta; revogação; TOTP (`otplib`) obrigatório para
  administrador, gestor e analista, com segredo cifrado AES-256-GCM; bloqueio progressivo por conta+IP; redefinição de senha
  por token de uso único (hash, 30 min); troca forçada de senha.
- **Validação** com `zod`, derivada do **dicionário de dados único** (`src/lib/dicionario`).
- **Gráficos**: Recharts com tokens `viz-*`. **Mapa**: `d3-geo` projeta GeoJSON em paths SVG, sem tiles externos.
- **Importação**: `papaparse` (CSV), `exceljs` (XLSX, só valores), `jszip` + `fast-xml-parser` (DOCX, só tabelas do modelo),
  `unified`/`remark-gfm` (MD, só seções/tabela do modelo).
- **Saídas**: `exceljs` (XLSX), `docx` (modelo DOCX), `pdfkit` (PDF com gráficos em vetor).
- **Testes**: Vitest (unidade + integração) e Playwright (e2e).

## Camadas de dados

1. **Identidade/administração** — `usuarios`, `papeis`, `permissoes`, `papel_permissoes`, `usuario_papeis`, `sessoes`,
   `tentativas_login`, `tokens_redefinicao`, `entidades`.
2. **Cadastros** — `regioes`, `bairros`, `bases_geograficas`, `classificacoes`, `tags`, `modelos_importacao`.
3. **Recebidos** — `submissoes`, `submissao_versoes`, `registros_recebidos`, `arquivos_recebidos`, `pendencias`,
   `comentarios_tecnicos`, `decisoes_analise`.
4. **Analítica aprovada** — `registros_aprovados`, `registro_tags`, `registro_historico`.
5. **Pública** — `publicacoes`, `indicadores_publicados` (células já agregadas, com supressão aplicada).
6. **Transversal** — `configuracoes_metodologicas`, `auditoria` (append-only por trigger), `notificacoes`,
   `visualizacoes_salvas`, `relatorios_gerados`.

As camadas 3→4→5 são **fisicamente separadas**: a API pública só lê a camada 5.

## Estrutura de pastas

```
src/app/(publico)/        landing, /mapa, /entrar, /recuperar-senha
src/app/(app)/            painel, entidade/*, analise/[id], dashboard, monitoramento, relatorios, notificacoes, conta, admin/*
src/app/api/publico/      indicadores, geo  (somente indicadores_publicados)
src/app/api/              modelos/[formato], relatorios, importacao   (autenticadas)
src/components/ds/        design system (Icon, Button, StatusBadge, TextField, ...)
src/components/{charts,mapa,landing}/
src/lib/dicionario/       FONTE ÚNICA dos campos, domínios e modelos
src/lib/auth/             senha, sessão, mfa, rbac, guards
src/lib/db/               schema e cliente
src/lib/importacao/       segurança de arquivo + leitores
src/lib/modelos/          geradores CSV/XLSX/DOCX/MD
src/lib/validacao/        regras, detecção de PII, duplicidade, qualidade
src/lib/fluxo/            máquina de estados
src/lib/publicacao/       agregação e supressão
src/server/               serviços (permissão + escopo + auditoria)
docs/  scripts/  db/migrations/
```

## Defesa em profundidade no acesso

1. `middleware.ts` redireciona rotas não públicas sem cookie de sessão.
2. Cada página/ação/rota chama `requireUser()` e `requirePermission()`.
3. Cada serviço aplica o escopo `entidade_id` para usuários de entidade e grava auditoria.
4. A API pública só consulta `indicadores_publicados`.

## Modo demonstração

`OMV_MODO_DEMO=true` ativa fixtures **fictícias** determinísticas (`src/lib/demo`), mantidas fora do banco, sempre sinalizadas por
uma faixa “DEMONSTRAÇÃO — dados fictícios”. Sem dados reais e fora do modo demonstração, as telas mostram estados vazios institucionais.
