# Dicionário de dados

> Gerado automaticamente por `pnpm docs:dicionario` a partir de `src/lib/dicionario`. **Não edite à mão.**
> Modelo **OMV-MULHERES** · versão **1.0.0**. Todos os domínios são **PROVISÓRIOS** até validação da Secretaria.

## Campos do envio (cabeçalho)

| Campo (chave) | Rótulo | Tipo | Obrigatório | Domínio | Orientação | Exemplo |
| --- | --- | --- | --- | --- | --- | --- |
| `periodo_inicio` | Início do período de referência | data | sim | — | Primeiro dia do período a que os números se referem (dd/mm/aaaa ou aaaa-mm-dd). | 01/03/2026 |
| `periodo_fim` | Fim do período de referência | data | sim | — | Último dia do período. Não pode ser anterior ao início nem estar no futuro. | 31/03/2026 |
| `observacao_geral` | Observação geral do envio | texto_longo (máx. 500) | não | — | Contexto metodológico do envio. NÃO escreva nomes, documentos, telefones, e-mails ou endereços. | Dados consolidados do mês, incluindo plantão. |

## Campos de cada linha (registro agregado)

| Campo (chave) | Rótulo | Tipo | Obrigatório | Domínio | Orientação | Exemplo |
| --- | --- | --- | --- | --- | --- | --- |
| `periodo_inicio` | Início do período | data | sim | — | Primeiro dia do período da linha (dd/mm/aaaa ou aaaa-mm-dd). O período deve estar dentro de um único mês. | 01/03/2026 |
| `periodo_fim` | Fim do período | data | sim | — | Último dia do período da linha. Não pode ser anterior ao início, estar em outro mês nem no futuro. | 31/03/2026 |
| `bairro` | Bairro | dominio | sim | bairro | Bairro do cadastro oficial (código ou nome). Use apenas bairros da lista. | Centro |
| `tipo_registro` | Tipo de registro | dominio | sim | tipo_registro | Natureza do registro que originou a contagem. | atendimento_servico |
| `unidade_contagem` | Unidade de contagem | dominio | sim | unidade_contagem | O que a quantidade conta: registros, atendimentos ou pessoas únicas. Medidas distintas nunca são somadas. | atendimento |
| `categoria_violencia` | Categoria de violência | dominio | sim | categoria_violencia | Categoria principal. Use “Não especificada” quando não houver classificação. | psicologica |
| `faixa_etaria` | Faixa etária | dominio | sim | faixa_etaria | Faixa etária da pessoa atendida (nunca a idade exata ou data de nascimento). | 25_34 |
| `tipo_atendimento` | Tipo de atendimento | dominio | condicional — Obrigatório quando o tipo de registro é “Atendimento em serviço da rede”. | tipo_atendimento | Principal atendimento prestado. | acolhimento |
| `canal_entrada` | Canal de entrada | dominio | não | canal_entrada | Como a demanda chegou ao serviço. | demanda_espontanea |
| `relacao_autor` | Vínculo com o autor | dominio | não | relacao_autor | Apenas o tipo de vínculo — nunca a identificação do autor. | ex_companheiro |
| `situacao_atendimento` | Situação do atendimento | dominio | não | situacao_atendimento | Situação ao final do período. | em_acompanhamento |
| `quantidade` | Quantidade | inteiro | sim | — | Número inteiro maior ou igual a zero, conforme a unidade de contagem. | 12 |
| `observacao` | Observação da linha | texto (máx. 200) | não | — | Opcional. Não registre dados pessoais; linhas com possível dado pessoal são bloqueadas para análise restrita. | — |

## Domínios (classificações)

### Categoria de violência (`categoria_violencia`)

| Código | Rótulo | Observação |
| --- | --- | --- |
| `fisica` | Violência física |  |
| `psicologica` | Violência psicológica |  |
| `sexual` | Violência sexual |  |
| `patrimonial` | Violência patrimonial |  |
| `moral` | Violência moral |  |
| `descumprimento_medida` | Descumprimento de medida protetiva |  |
| `nao_especificada` | Não especificada |  |

### Tipo de registro (`tipo_registro`)

| Código | Rótulo | Observação |
| --- | --- | --- |
| `ocorrencia_policial` | Ocorrência policial | Unidades permitidas: registro |
| `atendimento_servico` | Atendimento em serviço da rede | Unidades permitidas: atendimento, pessoa_unica |
| `denuncia_canal` | Denúncia em canal de atendimento | Unidades permitidas: registro |
| `medida_protetiva` | Medida protetiva | Unidades permitidas: registro |
| `encaminhamento` | Encaminhamento | Unidades permitidas: registro, atendimento |

### Faixa etária (`faixa_etaria`)

| Código | Rótulo | Observação |
| --- | --- | --- |
| `ate_17` | Até 17 anos |  |
| `18_24` | 18 a 24 anos |  |
| `25_34` | 25 a 34 anos |  |
| `35_44` | 35 a 44 anos |  |
| `45_59` | 45 a 59 anos |  |
| `60_mais` | 60 anos ou mais |  |
| `nao_informada` | Não informada |  |

### Tipo de atendimento (`tipo_atendimento`)

| Código | Rótulo | Observação |
| --- | --- | --- |
| `acolhimento` | Acolhimento |  |
| `orientacao_juridica` | Orientação jurídica |  |
| `psicossocial` | Atendimento psicossocial |  |
| `saude` | Atendimento em saúde |  |
| `abrigamento` | Abrigamento |  |
| `outro` | Outro |  |

### Canal de entrada (`canal_entrada`)

| Código | Rótulo | Observação |
| --- | --- | --- |
| `demanda_espontanea` | Demanda espontânea |  |
| `encaminhamento_rede` | Encaminhamento da rede |  |
| `denuncia_180` | Central de atendimento 180 |  |
| `delegacia` | Delegacia |  |
| `outro` | Outro |  |

### Vínculo com o autor (`relacao_autor`)

| Código | Rótulo | Observação |
| --- | --- | --- |
| `companheiro` | Companheiro(a) atual |  |
| `ex_companheiro` | Ex-companheiro(a) |  |
| `familiar` | Familiar |  |
| `outro` | Outro vínculo |  |
| `nao_informada` | Não informada |  |

### Situação do atendimento (`situacao_atendimento`)

| Código | Rótulo | Observação |
| --- | --- | --- |
| `em_acompanhamento` | Em acompanhamento |  |
| `encerrado` | Encerrado |  |
| `encaminhado` | Encaminhado a outro serviço |  |

### Unidade de contagem (`unidade_contagem`)

| Código | Rótulo | Observação |
| --- | --- | --- |
| `registro` | Registros | Número de registros (ocorrências) no período. |
| `atendimento` | Atendimentos | Número de atendimentos realizados no período. |
| `pessoa_unica` | Pessoas atendidas (únicas) | Pessoas distintas atendidas no período, sem identificá-las. |

## Regras de validação (resumo)

- Período de cada linha dentro de **um único mês**, sem datas futuras; início ≤ fim.
- Quantidade: inteiro ≥ 0. Unidades de contagem (registros, atendimentos, pessoas únicas) **nunca são somadas**.
- Unidade de contagem deve ser compatível com o tipo de registro.
- Bairro deve existir no cadastro ativo.
- “Tipo de atendimento” é obrigatório quando o tipo de registro é “Atendimento em serviço da rede”.
- Textos livres e todas as células são verificados quanto a possível dado pessoal (CPF, RG, telefone, e-mail, CEP, logradouro, coordenadas, data de nascimento e nomes). O envio é marcado como **restrito** e não pode ser aprovado.
- Duplicidade interna e entre envios da mesma entidade; variação brusca em relação ao histórico.
