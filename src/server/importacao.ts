import 'server-only';
import { registrar } from '@/lib/auditoria';
import { exigir } from '@/lib/auth/guards';
import type { UsuarioAtual } from '@/lib/auth/usuario';
import { ErroImportacao, lerArquivo, verificarArquivo } from '@/lib/importacao';
import type { RelatorioValidacao } from '@/lib/validacao/tipos';
import { salvarRascunho } from '@/server/submissoes';

export type EtapaImportacao = { n: number; titulo: string; estado: 'ok' | 'alerta' | 'erro' | 'pendente'; detalhe?: string };

const TITULOS = [
  'Formato e extensão',
  'Arquivo recebido',
  'Verificação de segurança (assinatura, tipo, tamanho, compactação)',
  'Verificação de macros, fórmulas e objetos incorporados',
  'Leitura do conteúdo (somente valores e tabelas do modelo)',
  'Conferência do modelo e da versão',
  'Normalização dos valores',
  'Validação linha a linha',
  'Detecção de possível dado pessoal',
  'Duplicidade interna e entre envios',
  'Relatório de validação',
  'Rascunho criado para revisão',
  'Aguardando sua confirmação para enviar',
];

export type ResultadoImportacao =
  | { ok: true; id: string; etapas: EtapaImportacao[]; relatorio: RelatorioValidacao; linhas: number }
  | { ok: false; erro: string; codigo: string; etapas: EtapaImportacao[] };

/** Importação NUNCA envia nem aprova: cria apenas um rascunho que exige confirmação humana. */
export async function processarImportacao(
  u: UsuarioAtual,
  arquivo: { nome: string; mime: string; buffer: Buffer },
): Promise<ResultadoImportacao> {
  exigir(u, 'submissao:importar');
  const etapas: EtapaImportacao[] = TITULOS.map((titulo, i) => ({ n: i + 1, titulo, estado: 'pendente' }));
  const marcar = (ate: number, estado: EtapaImportacao['estado'] = 'ok') => {
    for (let i = 0; i < ate; i++) if (etapas[i]!.estado === 'pendente') etapas[i]!.estado = estado;
  };
  try {
    verificarArquivo(arquivo.nome, arquivo.buffer, arquivo.mime);
    marcar(4);
    const leitura = await lerArquivo(arquivo.nome, arquivo.buffer, arquivo.mime);
    marcar(5);
    const achadoModelo = leitura.achados.filter((a) => a.codigo.startsWith('modelo_'));
    etapas[5]!.estado = achadoModelo.some((a) => a.nivel === 'erro') ? 'erro' : achadoModelo.length ? 'alerta' : 'ok';
    etapas[5]!.detalhe = achadoModelo.map((a) => a.mensagem).join(' ') || undefined;
    if (etapas[5]!.estado === 'erro') {
      await registrar({ usuarioId: u.id, entidadeId: u.entidadeId, acao: 'importacao.rejeitada', detalhes: { codigo: achadoModelo[0]?.codigo, formato: leitura.formato } });
      return { ok: false, erro: etapas[5]!.detalhe ?? 'Modelo incompatível.', codigo: achadoModelo[0]?.codigo ?? 'modelo', etapas };
    }
    const colunasErro = leitura.achados.filter((a) => a.codigo === 'coluna_ausente');
    if (colunasErro.length) {
      etapas[6]!.estado = 'erro';
      etapas[6]!.detalhe = colunasErro.map((a) => a.mensagem).join(' ');
      return { ok: false, erro: etapas[6]!.detalhe, codigo: 'coluna_ausente', etapas };
    }
    marcar(7);
    const r = await salvarRascunho(u, { cabecalho: {}, linhas: leitura.linhas, tipoEntrada: leitura.formato, arquivo: { nome: leitura.nomeSeguro, mime: arquivo.mime, buffer: arquivo.buffer }, versaoModeloArquivo: leitura.controle?.versao });
    const rel = r.relatorio;
    const tem = (cod: string) => rel.achados.some((a) => a.codigo.startsWith(cod));
    etapas[7]!.estado = rel.achados.some((a) => a.nivel === 'erro') ? 'erro' : 'ok';
    etapas[7]!.detalhe = `${rel.resumo.erros} erro(s) em ${rel.resumo.linhasInvalidas} linha(s).`;
    etapas[8]!.estado = rel.restrita ? 'alerta' : 'ok';
    etapas[8]!.detalhe = rel.restrita ? 'Possível dado pessoal detectado: o envio será restrito e não poderá ser aprovado até a correção.' : undefined;
    etapas[9]!.estado = tem('duplicidade') ? 'alerta' : 'ok';
    etapas[10]!.estado = rel.resumo.erros ? 'erro' : rel.resumo.alertas ? 'alerta' : 'ok';
    etapas[10]!.detalhe = `${rel.resumo.totalLinhas} linha(s), ${rel.resumo.erros} erro(s), ${rel.resumo.alertas} alerta(s).`;
    etapas[11]!.estado = 'ok';
    etapas[12]!.estado = 'alerta';
    etapas[12]!.detalhe = 'Revise o relatório e confirme o envio na página do rascunho. Nada é enviado automaticamente.';
    await registrar({ usuarioId: u.id, entidadeId: u.entidadeId, acao: 'importacao.concluida', recursoTipo: 'submissao', recursoId: r.id, detalhes: { formato: leitura.formato, linhas: leitura.linhas.length } });
    return { ok: true, id: r.id, etapas, relatorio: rel, linhas: leitura.linhas.length };
  } catch (e) {
    if (e instanceof ErroImportacao) {
      const falhou = etapas.findIndex((x) => x.estado === 'pendente');
      if (falhou >= 0) {
        etapas[falhou]!.estado = 'erro';
        etapas[falhou]!.detalhe = e.message;
      }
      await registrar({ usuarioId: u.id, entidadeId: u.entidadeId, acao: 'importacao.rejeitada', detalhes: { codigo: e.codigo } });
      return { ok: false, erro: e.message, codigo: e.codigo, etapas };
    }
    throw e;
  }
}
