import { CAMPOS_LINHA } from '../dicionario/campos';
import { COLUNAS, DECLARACAO_SEM_DADOS_PESSOAIS, IDENTIFICACAO, TEXTO_INSTRUCOES, listaDominio, rotuloDominio, type ListasModelo } from './comum';

export function gerarMd(listas: ListasModelo): Buffer {
  const cab = `| ${COLUNAS.map((c) => c.rotulo).join(' | ')} |`;
  const sep = `| ${COLUNAS.map(() => '---').join(' | ')} |`;
  const vazias = Array.from({ length: 5 }, () => `| ${COLUNAS.map(() => ' ').join(' | ')} |`);
  const doms = new Map<string, string>();
  for (const c of CAMPOS_LINHA) if (c.dominio) doms.set(c.dominio, rotuloDominio(c.dominio));
  const md = [
    '# Modelo de envio — OMV Mulheres',
    '',
    `<!-- omv-modelo: ${IDENTIFICACAO.id} ${IDENTIFICACAO.versao} -->`,
    `Modelo: **${IDENTIFICACAO.id}** · versão **${IDENTIFICACAO.versao}**`,
    '',
    '## Instruções',
    '',
    ...TEXTO_INSTRUCOES.map((t) => `- ${t}`),
    '',
    `> ${DECLARACAO_SEM_DADOS_PESSOAIS}`,
    '',
    '## Dados',
    '',
    'Preencha a tabela abaixo (uma linha por combinação). Apague as linhas que não usar.',
    '',
    cab,
    sep,
    ...vazias,
    '',
    '## Campos',
    '',
    '| Campo | Obrigatório | Ajuda | Exemplo |',
    '| --- | --- | --- | --- |',
    ...CAMPOS_LINHA.map((c) => `| ${c.rotulo} | ${c.obrigatorio ? 'sim' : c.condicional ? 'condicional' : 'não'} | ${c.ajuda.replace(/\|/g, '/')} | ${c.exemplo} |`),
    '',
    '## Listas permitidas',
    '',
    ...[...doms.entries()].flatMap(([d, rot]) => [
      `### ${rot}`,
      '',
      ...listaDominio(listas, d as never).map((v) => `- ${v}`),
      '',
    ]),
  ].join('\n');
  return Buffer.from(md, 'utf8');
}
