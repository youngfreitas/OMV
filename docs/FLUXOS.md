# Fluxos

## Ciclo de vida de um envio (submissão)

```
rascunho → enviado → aguardando_analise → em_analise ─┬→ aprovado → (retirado)
                                                      ├→ rejeitado   (justificativa obrigatória)
                                                      └→ pendente_correcao → reenviado → em_analise → …
```

- Importações **nunca** são aprovadas ou publicadas automaticamente: seguem o mesmo fluxo e exigem confirmação humana.
- Aprovador ≠ quem enviou (segregação configurável).
- Envio marcado como `restrita` (possível dado pessoal) fica **bloqueado para aprovação**; o conteúdo só é visível a quem tem
  `analise:dados_restritos` e nunca é reproduzido em notificações ou logs. Resolve-se devolvendo para correção ou rejeitando.
- Aprovação copia os registros para `registros_aprovados`. Retirada marca `ativo=false`, exige republicação e gera auditoria.

## Importação (13 passos)

1. Escolher formato e baixar o modelo. 2. Selecionar o arquivo. 3. Verificação de segurança (extensão, MIME, assinatura, tamanho,
zip-bomb, macros, fórmulas). 4. Leitura (apenas valores/tabelas do modelo). 5. Conferência da versão do modelo. 6. Normalização.
7. Validação linha a linha. 8. Detecção de possível dado pessoal. 9. Duplicidade interna e entre envios. 10. Relatório de validação.
11. Correção (ou novo envio do arquivo). 12. Confirmação humana e protocolo. 13. Envio para a fila de análise.

## Publicação

1. Gestor gera uma publicação (agregação dos `registros_aprovados` ativos nos cubos pré-definidos).
2. Motor aplica supressão primária (< k), complementar e generalização territorial.
3. Pré-visualização com relatório de supressão; publicação grava `indicadores_publicados`.
4. Retirada de submissão ⇒ nova publicação + auditoria.
5. Combinação não pré-computada ⇒ “Dados indisponíveis para divulgação nesta combinação de filtros”.
