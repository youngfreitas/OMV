import { CAMPOS_LINHA, ID_MODELO, VERSAO_MODELO, DECLARACAO_SEM_DADOS_PESSOAIS } from '../dicionario/campos';
import { ROTULOS_DOMINIO, type Dominios, type NomeDominio } from '../dicionario/dominios';
import { chaveTexto } from '../validacao/normalizar';

export type ListasModelo = { dominios: Dominios; bairros: string[] };
export type FormatoModelo = 'csv' | 'xlsx' | 'docx' | 'md';
export const FORMATOS: FormatoModelo[] = ['csv', 'xlsx', 'docx', 'md'];

export const NOME_ARQUIVO: Record<FormatoModelo, string> = {
  csv: `modelo-omv-mulheres-v${VERSAO_MODELO}.csv`,
  xlsx: `modelo-omv-mulheres-v${VERSAO_MODELO}.xlsx`,
  docx: `modelo-omv-mulheres-v${VERSAO_MODELO}.docx`,
  md: `modelo-omv-mulheres-v${VERSAO_MODELO}.md`,
};

export const MIME: Record<FormatoModelo, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  md: 'text/markdown; charset=utf-8',
};

export const COLUNAS = CAMPOS_LINHA.map((c) => ({ chave: c.chave, rotulo: c.rotulo }));

/** Mapa de cabeçalho (chave OU rótulo, sem acentos) → chave do dicionário. */
export function mapaCabecalhos(): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of CAMPOS_LINHA) {
    m.set(chaveTexto(c.chave), c.chave);
    m.set(chaveTexto(c.rotulo), c.chave);
  }
  return m;
}

export function listaDominio(l: ListasModelo, d: NomeDominio | 'bairro'): string[] {
  if (d === 'bairro') return l.bairros;
  return (l.dominios[d] ?? []).map((i) => i.rotulo);
}

export function rotuloDominio(d: NomeDominio | 'bairro'): string {
  return d === 'bairro' ? 'Bairro' : ROTULOS_DOMINIO[d];
}

export const TEXTO_INSTRUCOES = [
  'Preencha uma linha para cada combinação de características, informando a quantidade correspondente. Os números são sempre agregados.',
  'NUNCA informe nome, CPF, RG, telefone, e-mail, endereço, coordenadas ou qualquer dado que identifique a pessoa atendida.',
  'Registros, atendimentos e pessoas atendidas (únicas) são medidas diferentes: use a unidade de contagem correta e não some medidas distintas.',
  'Cada linha deve estar dentro de um único mês. Para períodos maiores, use uma linha por mês.',
  'Não use fórmulas, macros, imagens ou objetos incorporados; arquivos com esses itens são recusados.',
  'Não altere os nomes das colunas nem a identificação do modelo.',
];

export const IDENTIFICACAO = { id: ID_MODELO, versao: VERSAO_MODELO };
export { DECLARACAO_SEM_DADOS_PESSOAIS };
