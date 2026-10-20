import { ID_MODELO, VERSAO_MODELO } from '../dicionario/campos';
import type { Achado } from '../validacao/tipos';
import { lerCsv } from './csv';
import { lerDocx } from './docx';
import { lerMd } from './md';
import { verificarArquivo } from './seguranca';
import { ErroImportacao, type ResultadoLeitura } from './tipos';
import { lerXlsx } from './xlsx';

export * from './tipos';
export { verificarArquivo, nomeSeguro, LIMITE_BYTES } from './seguranca';

export function conferirControle(c: ResultadoLeitura['controle']): Achado[] {
  if (!c) {
    return [{ nivel: 'alerta', codigo: 'modelo_sem_identificacao', mensagem: 'O arquivo não traz a identificação do modelo. Prefira sempre o modelo oficial atual.' }];
  }
  if (c.idModelo !== ID_MODELO) {
    return [{ nivel: 'erro', codigo: 'modelo_incorreto', mensagem: `O arquivo é de outro modelo (${c.idModelo ?? '?'}). Use o modelo ${ID_MODELO}.` }];
  }
  const [maiorArq] = (c.versao ?? '0').split('.');
  const [maiorAtual] = VERSAO_MODELO.split('.');
  if (maiorArq !== maiorAtual) {
    return [{ nivel: 'erro', codigo: 'modelo_desatualizado', mensagem: `Versão do modelo incompatível (${c.versao}); a atual é ${VERSAO_MODELO}. Baixe o modelo atualizado.` }];
  }
  if (c.versao !== VERSAO_MODELO) {
    return [{ nivel: 'alerta', codigo: 'modelo_versao_diferente', mensagem: `O arquivo usa a versão ${c.versao}; a atual é ${VERSAO_MODELO}.` }];
  }
  return [];
}

/** Segurança → leitura (somente valores/tabelas do modelo) → conferência da versão. */
export async function lerArquivo(nome: string, buffer: Buffer, mime = ''): Promise<ResultadoLeitura & { nomeSeguro: string }> {
  const v = verificarArquivo(nome, buffer, mime);
  let r: ResultadoLeitura;
  switch (v.formato) {
    case 'csv':
      r = lerCsv(v.texto!);
      break;
    case 'md':
      r = lerMd(v.texto!);
      break;
    case 'xlsx':
      r = await lerXlsx(buffer);
      break;
    case 'docx':
      r = await lerDocx(buffer);
      break;
  }
  if (r.linhas.length === 0) throw new ErroImportacao('O arquivo não possui nenhuma linha de dados.', 'sem_linhas');
  return { ...r, achados: [...conferirControle(r.controle), ...r.achados], nomeSeguro: v.nome };
}
