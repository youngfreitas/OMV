import { notFound } from 'next/navigation';
import { Banner, ButtonLink, Cartao, Pagina, StatusBadge, Table } from '@/components/ds';
import { RelatorioView } from '@/components/envio/Relatorio';
import { requirePermission } from '@/lib/auth/guards';
import { ErroNegocio } from '@/lib/auth/erros';
import { fmtData, fmtDataHora, fmtNumero } from '@/lib/formato';
import { editavel, type Status } from '@/lib/fluxo/maquina';
import { carregarBairros, carregarDominios } from '@/server/cadastros';
import { detalheSubmissao } from '@/server/submissoes';
import { AcoesEnvio } from './AcoesEnvio';

export const metadata = { title: 'Envio' };

export default async function DetalheEnvio({ params }: { params: Promise<{ id: string }> }) {
  const u = await requirePermission('submissao:ler_proprias', 'submissao:ler_todas');
  const { id } = await params;
  let d;
  try {
    d = await detalheSubmissao(u, id);
  } catch (e) {
    if (e instanceof ErroNegocio) notFound();
    throw e;
  }
  const [dominios, bairros] = await Promise.all([carregarDominios(), carregarBairros(false)]);
  const rot = (dom: string, cod?: string) => (cod ? (dominios[dom]?.find((i) => i.codigo === cod)?.rotulo ?? cod) : '—');
  const s = d.submissao;
  const pendAbertas = d.pendencias.filter((p) => p.status === 'aberta');
  return (
    <Pagina
      titulo={s.protocolo ? `Envio ${s.protocolo}` : 'Rascunho de envio'}
      descricao={s.periodoInicio ? `Período: ${fmtData(s.periodoInicio)} a ${fmtData(s.periodoFim!)} · Modelo ${d.modelo.id} v${d.modelo.versao}` : undefined}
      acoes={editavel(s.status as Status) && u.permissoes.has('submissao:criar') ? <ButtonLink href={`/entidade/envios/${id}/editar`} icon="editar" variant="secondary">{s.status === 'pendente_correcao' ? 'Corrigir' : 'Editar'}</ButtonLink> : undefined}
    >
      <div className="omv-linha">
        <StatusBadge status={s.status} />
        {s.restrita ? <StatusBadge status="restrito" /> : null}
        <span className="omv-legenda">Entidade: {d.entidade.nome}</span>
      </div>
      {s.status === 'pendente_correcao' ? (
        <Banner tipo="alerta" titulo="Correção solicitada">
          {d.decisoes.filter((x) => x.acao === 'devolver').at(-1)?.justificativa ?? 'Verifique as pendências abaixo.'}
        </Banner>
      ) : null}
      {s.status === 'rejeitado' ? <Banner tipo="erro" titulo="Envio rejeitado">{d.decisoes.filter((x) => x.acao === 'rejeitar').at(-1)?.justificativa}</Banner> : null}
      {u.permissoes.has('submissao:criar') ? <AcoesEnvio id={id} status={s.status} /> : null}
      {pendAbertas.length ? (
        <Cartao titulo="Pendências">
          <ul>
            {pendAbertas.map((p) => (
              <li key={p.id}>
                {p.linha ? <strong>Linha {p.linha}: </strong> : null}
                {p.descricao}
              </li>
            ))}
          </ul>
        </Cartao>
      ) : null}
      {d.relatorio ? (
        <Cartao titulo="Relatório de validação">
          <RelatorioView r={d.relatorio} />
        </Cartao>
      ) : null}
      <Cartao titulo={`Registros (${d.linhas.length})`}>
        <Table legenda="Registros do envio">
          <thead>
            <tr>
              <th>#</th>
              <th>Período</th>
              <th>Bairro</th>
              <th>Tipo</th>
              <th>Unidade</th>
              <th>Categoria</th>
              <th>Faixa etária</th>
              <th className="num">Quantidade</th>
              <th>Validação</th>
            </tr>
          </thead>
          <tbody>
            {d.linhas.map((l) => {
              const n = l.dados.normalizada as Record<string, string | number>;
              const bairro = bairros.find((b) => b.codigo === n.bairro)?.nome ?? '—';
              return (
                <tr key={l.id}>
                  <td>{l.linha}</td>
                  <td>{n.periodo_inicio ? `${fmtData(String(n.periodo_inicio))}` : '—'}</td>
                  <td>{bairro}</td>
                  <td>{rot('tipo_registro', String(n.tipo_registro))}</td>
                  <td>{rot('unidade_contagem', String(n.unidade_contagem))}</td>
                  <td>{rot('categoria_violencia', String(n.categoria_violencia))}</td>
                  <td>{rot('faixa_etaria', String(n.faixa_etaria))}</td>
                  <td className="num">{fmtNumero(Number(n.quantidade))}</td>
                  <td>{l.statusValidacao === 'ok' ? 'Ok' : l.statusValidacao === 'alerta' ? 'Alerta' : 'Erro'}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Cartao>
      <Cartao titulo="Histórico">
        <ul>
          {d.decisoes.map((x) => (
            <li key={x.id}>
              {fmtDataHora(x.criadoEm)} — {x.acao} ({x.deStatus} → {x.paraStatus}){x.justificativa ? `: ${x.justificativa}` : ''}
            </li>
          ))}
          {d.comentarios.map((c) => (
            <li key={c.id}>{fmtDataHora(c.criadoEm)} — Comentário da análise: {c.texto}</li>
          ))}
        </ul>
      </Cartao>
    </Pagina>
  );
}
