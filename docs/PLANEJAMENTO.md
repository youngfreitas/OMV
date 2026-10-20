# OMV — Observatório Municipal de Violência de Ubatuba · Planejamento

Plataforma para monitoramento **agregado** da violência doméstica contra mulheres em Ubatuba, vinculada à
Secretaria Municipal de Defesa dos Direitos da Mulher e da Pessoa com Deficiência.

## Decisões confirmadas

| Tema | Decisão |
| --- | --- |
| Base geográfica | Ainda não existe a base oficial de bairros. Usa-se o contorno municipal (IBGE 3555406), uma camada demonstrativa claramente rotulada (só no modo demonstração) e um importador GeoJSON pronto para a base oficial. |
| Infraestrutura | PostgreSQL próprio, agnóstico de fornecedor (Docker Compose), autenticação própria com MFA. |
| Escopo | Somente violência contra mulheres. A estrutura (classificações, dicionário) é extensível para outros públicos. |
| Design | Design system “OMV” (tokens, componentes, logos oficiais em `public/marca/`). Nunca redesenhar o logotipo. |

## Princípios inegociáveis

1. **Nenhum dado pessoal da pessoa atendida** em nenhuma tabela, arquivo, log ou notificação: nada de nome, CPF, RG,
   endereço, telefone, e-mail, coordenadas ou anexos.
2. **Somente agregados** chegam ao público; a API pública lê apenas `indicadores_publicados`.
3. **Supressão estatística** primária e complementar antes de qualquer publicação (parâmetros **PROVISÓRIOS** até validação).
4. **Medidas distintas nunca são somadas** (registros × atendimentos × pessoas únicas) e não existe “índice de violência”.
5. **Toda operação** passa por `requireUser` + `requirePermission` + escopo de entidade + auditoria.
6. Textos sóbrios, em pt-BR, sem inventar competências, contatos ou números oficiais (espaços “a confirmar”).

## Etapas

1. Planejamento, scaffold, documentos-base.
2. Design system e landing pública.
3. Autenticação, MFA, RBAC, entidades e usuários, auditoria.
4. Dicionário único, formulário multietapas, modelos (CSV/XLSX/DOCX/MD) e importação segura.
5. Fluxo de análise e validação automática, pendências, comentários, notificações.
6. Banco analítico, motor de supressão, publicação e API pública.
7. Dashboard, monitoramento, cadastros, relatórios PDF/XLSX.
8. Mapa público e importador GeoJSON.
9. Segurança e testes (unidade, integração, e2e).
10. Documentação de produção (instalação, LGPD, metodologia, dicionário de dados).

Cada etapa termina com o aplicativo funcional, testes passando e commit/push.

## Verificação

- `pnpm typecheck && pnpm lint && pnpm test` (Vitest, inclui integração com Postgres de teste).
- `pnpm test:e2e` (Playwright): visitante acessa apenas `/` e `/mapa`; APIs privadas retornam 401/403; entidade A não vê envio
  da entidade B; envio → análise → aprovação → publicação → indicador no mapa com supressão; retirada remove.
- Round-trip dos quatro modelos; arquivos com macro, fórmula, assinatura falsa e zip-bomb são rejeitados.

As pendências que dependem da instituição estão em [`PENDENCIAS-INSTITUCIONAIS.md`](./PENDENCIAS-INSTITUCIONAIS.md).
