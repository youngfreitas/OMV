/** Gera docs/DICIONARIO-DE-DADOS.md a partir do dicionário único (src/lib/dicionario). */
import { writeFileSync } from 'node:fs';
import { CAMPOS_ENVIO, CAMPOS_LINHA, ID_MODELO, VERSAO_MODELO, type CampoDef } from '../src/lib/dicionario/campos';
import { DOMINIOS_PADRAO, ROTULOS_DOMINIO, type NomeDominio } from '../src/lib/dicionario/dominios';

const tabela = (campos: CampoDef[]) =>
  [
    '| Campo (chave) | Rótulo | Tipo | Obrigatório | Domínio | Orientação | Exemplo |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...campos.map(
      (c) =>
        `| \`${c.chave}\` | ${c.rotulo} | ${c.tipo}${c.max ? ` (máx. ${c.max})` : ''} | ${c.obrigatorio ? 'sim' : c.condicional ? `condicional — ${c.condicional.descricao}` : 'não'} | ${c.dominio ?? '—'} | ${c.ajuda} | ${c.exemplo || '—'} |`,
    ),
  ].join('\n');

const md = `# Dicionário de dados

> Gerado automaticamente por \`pnpm docs:dicionario\` a partir de \`src/lib/dicionario\`. **Não edite à mão.**
> Modelo **${ID_MODELO}** · versão **${VERSAO_MODELO}**. Todos os domínios são **PROVISÓRIOS** até validação da Secretaria.

## Campos do envio (cabeçalho)

${tabela(CAMPOS_ENVIO)}

## Campos de cada linha (registro agregado)

${tabela(CAMPOS_LINHA)}

## Domínios (classificações)

${(Object.keys(DOMINIOS_PADRAO) as NomeDominio[])
  .map(
    (d) =>
      `### ${ROTULOS_DOMINIO[d]} (\`${d}\`)\n\n| Código | Rótulo | Observação |\n| --- | --- | --- |\n${(DOMINIOS_PADRAO[d] as Array<{ codigo: string; rotulo: string; definicao?: string; unidadesPermitidas?: string[] }>)
        .map((i) => `| \`${i.codigo}\` | ${i.rotulo} | ${i.definicao ?? (i.unidadesPermitidas ? `Unidades permitidas: ${i.unidadesPermitidas.join(', ')}` : '')} |`)
        .join('\n')}\n`,
  )
  .join('\n')}
## Regras de validação (resumo)

- Período de cada linha dentro de **um único mês**, sem datas futuras; início ≤ fim.
- Quantidade: inteiro ≥ 0. Unidades de contagem (registros, atendimentos, pessoas únicas) **nunca são somadas**.
- Unidade de contagem deve ser compatível com o tipo de registro.
- Bairro deve existir no cadastro ativo.
- “Tipo de atendimento” é obrigatório quando o tipo de registro é “Atendimento em serviço da rede”.
- Textos livres e todas as células são verificados quanto a possível dado pessoal (CPF, RG, telefone, e-mail, CEP, logradouro, coordenadas, data de nascimento e nomes). O envio é marcado como **restrito** e não pode ser aprovado.
- Duplicidade interna e entre envios da mesma entidade; variação brusca em relação ao histórico.
`;
writeFileSync('docs/DICIONARIO-DE-DADOS.md', md);
console.log('docs/DICIONARIO-DE-DADOS.md gerado');
