# Metodologia

> Parâmetros marcados **PROVISÓRIO** aguardam validação da Secretaria e do encarregado de dados.

## Unidades de contagem (medidas distintas)

1. **Registros** — ocorrências registradas no período.
2. **Atendimentos** — atendimentos realizados no período.
3. **Pessoas atendidas (únicas)** — pessoas distintas atendidas, sem identificação.

Elas **nunca são somadas** entre si (nem no dashboard, nem no mapa, nem nos relatórios). Não existe “índice de violência” para contagens. A unidade de cada linha deve ser compatível com o tipo de registro (ex.: ocorrência policial → registros).

## Fluxo de dados

`envio (formulário ou arquivo)` → validação automática → análise humana → **base analítica** (`registros_aprovados`) → publicação → `indicadores_publicados` (única fonte da API pública).

Importações não são aprovadas nem publicadas automaticamente. Aprovador ≠ remetente (configurável).

## Validação automática (alertas, não acusações)

Obrigatórios, datas e períodos (mesmo mês, não futuros), domínios, bairro inexistente, quantidade não inteira/negativa, unidade × tipo de registro, duplicidade interna (mesma combinação de dimensões) e entre envios (hash de entidade + período + linha), variação brusca (> 60% **PROVISÓRIO** sobre a média mensal histórica da entidade) e possível dado pessoal (ver `LGPD.md`).

## Agregação para publicação

Cubos unidimensionais por período (mês, ano e total): **total**, **território** (bairro e região), **categoria**, **faixa etária** e **tipo de registro**, separadamente por unidade de contagem.

### Supressão

1. **Primária**: células com 0 < valor < **k** (k = 5, PROVISÓRIO) são suprimidas. Zeros são publicados.
2. **Complementar**: em todo grupo aditivo (total = soma das partes: regiões do município, bairros da região, categorias/faixas/tipos do total, meses do ano, anos do total), se restasse exatamente **uma** célula suprimida ela seria recalculável por diferença; então suprime-se também a menor outra parte não nula. Com duas suprimidas e total publicado, verifica-se o intervalo de proteção e, se a soma determinar os valores, suprime-se uma terceira. O procedimento é iterado até um ponto fixo (o conjunto só cresce).
3. **Generalização territorial**: um bairro suprimido é exibido com o valor da **região**, quando este é publicável.
4. **Combinações**: apenas período + 1 dimensão (limite configurável). Outras combinações exibem: “Dados indisponíveis para divulgação nesta combinação de filtros.”
5. **Retirada**: retirar um envio aprovado inativa seus registros e **republica automaticamente** (ou tira a publicação do ar se nada restar).

O teste `tests/supressao.test.ts` simula um atacante que tenta resolver células por diferença (200 conjuntos aleatórios) e exige que nenhuma célula suprimida seja recuperada.

**Limitações conhecidas**: a supressão complementar cobre relações aditivas entre grupos; combinações lineares entre múltiplos grupos que atravessem tabelas distintas não são analisadas exaustivamente. A validação formal de k, dos grupos e dos intervalos de proteção é pendência institucional.

## Dashboard, monitoramento e relatórios

Quem tem `dados:ver_nao_suprimido` vê valores internos sem supressão (sempre sinalizados “uso interno”); os demais veem os mesmos resultados do motor de publicação. Variações entre períodos são apresentadas com **contexto** (quantas entidades enviaram dados em cada período) e linguagem descritiva: não indicam, por si, mudança na ocorrência de violência.

## Território

Enquanto a base oficial de bairros não existe, o mapa usa o contorno municipal (IBGE 3555406) e, **apenas no modo demonstração**, células hexagonais rotuladas “não representam bairros”. O importador GeoJSON (`/admin/geo`) liga feições a bairros do cadastro.
