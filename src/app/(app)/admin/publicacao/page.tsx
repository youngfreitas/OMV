import { Banner, Cartao, EmptyState, Pagina, StatusBadge, Table } from '@/components/ds';
import { requirePermission } from '@/lib/auth/guards';
import { fmtDataHora, fmtNumero } from '@/lib/formato';
import type { RelatorioSupressao } from '@/lib/publicacao/tipos';
import { listarPublicacoes, parametrosDaPublicacao, publicacaoDesatualizada } from '@/server/publicacao';
import { ControlesPublicacao, LinhaAcoesPublicacao } from './Controles';

export const metadata = { title: 'Publicação' };

export default async function PaginaPublicacao() {
  const u = await requirePermission('publicacao:ler');
  const [lista, params, desatualizada] = await Promise.all([listarPublicacoes(u), parametrosDaPublicacao(), publicacaoDesatualizada()]);
  const podePublicar = u.permissoes.has('publicacao:publicar');
  const podeRetirar = u.permissoes.has('publicacao:retirar');
  return (
    <Pagina titulo="Publicação" descricao="Geração dos indicadores públicos a partir dos registros aprovados, com supressão estatística. A API pública lê somente o resultado publicado.">
      <Banner tipo="alerta" titulo="Parâmetros PROVISÓRIOS">
        Limiar de supressão k = {params.k}; supressão complementar {params.complementar ? 'ativada' : 'desativada'}; no máximo {params.maxDimensoes} dimensões combináveis (período + 1). Aguardam validação da Secretaria e do encarregado de dados.
      </Banner>
      {desatualizada ? <Banner tipo="alerta" titulo="Publicação desatualizada">Há aprovações ou retiradas posteriores à publicação vigente. Gere uma nova publicação.</Banner> : null}
      {podePublicar ? (
        <Cartao titulo="Nova publicação">
          <ControlesPublicacao />
        </Cartao>
      ) : null}
      {lista.length === 0 ? (
        <div className="omv-painel">
          <EmptyState titulo="Nenhuma publicação gerada" icon="publicar">Aprove envios e gere a primeira publicação para alimentar o mapa público.</EmptyState>
        </div>
      ) : (
        <Table legenda="Publicações">
          <thead>
            <tr>
              <th>Versão</th>
              <th>Situação</th>
              <th>Gerada em</th>
              <th>Publicada em</th>
              <th className="num">Células</th>
              <th className="num">Suprimidas (prim./compl.)</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => {
              const r = p.relatorioSupressao as RelatorioSupressao | null;
              return (
                <tr key={p.id}>
                  <td>v{p.versao}</td>
                  <td>
                    <StatusBadge status={p.status === 'publicada' ? 'publicado' : p.status === 'rascunho' ? 'rascunho' : p.status === 'retirada' ? 'retirado' : 'arquivado'}>
                      {p.status === 'publicada' ? 'Publicada' : p.status === 'rascunho' ? 'Gerada (não publicada)' : p.status === 'retirada' ? 'Retirada' : 'Substituída'}
                    </StatusBadge>
                  </td>
                  <td>{fmtDataHora(p.geradaEm)}</td>
                  <td>{p.publicadaEm ? fmtDataHora(p.publicadaEm) : '—'}</td>
                  <td className="num">{r ? fmtNumero(r.celulas) : '—'}</td>
                  <td className="num">{r ? `${fmtNumero(r.suprimidasPrimarias)} / ${fmtNumero(r.suprimidasComplementares)}` : '—'}</td>
                  <td>
                    <LinhaAcoesPublicacao id={p.id} status={p.status} podePublicar={podePublicar} podeRetirar={podeRetirar} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Pagina>
  );
}
