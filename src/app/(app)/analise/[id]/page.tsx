import { notFound } from 'next/navigation';
import { Banner, Cartao, Pagina, StatusBadge, Table } from '@/components/ds';
import { RelatorioView } from '@/components/envio/Relatorio';
import { requirePermission } from '@/lib/auth/guards';
import { ErroNegocio } from '@/lib/auth/erros';
import { fmtData, fmtDataHora, fmtNumero } from '@/lib/formato';
import { PERMISSAO_DA_ACAO, acoesPossiveis, type AcaoFluxo, type Status } from '@/lib/fluxo/maquina';
import { carregarBairros, carregarDominios, configuracao } from '@/server/cadastros';
import { detalheSubmissao } from '@/server/submissoes';
import { Colaboracao, PainelDecisao, VerOriginal } from './Controles';

export const metadata = { title: 'Análise de envio' };

export default async function Analisar({ params }: { params: Promise<{ id: string }> }) {
  const u = await requirePermission('analise:ler');
  const { id } = await params;
  let d;
  try {
    d = await detalheSubmissao(u, id);
  } catch (e) {
    if (e instanceof ErroNegocio) notFound();
    throw e;
  }
  const [dominios, bairros, segregacao] = await Promise.all([carregarDominios(), carregarBairros(false), configuracao<boolean>('fluxo.segregacao_aprovador', true)]);
  const s = d.submissao;
  const rot = (dom: string, cod?: unknown) => (cod ? (dominios[dom]?.find((i) => i.codigo === cod)?.rotulo ?? String(cod)) : '—');
  const acoes = (['iniciar_analise', 'devolver', 'aprovar', 'rejeitar', 'retirar'] as AcaoFluxo[]).filter(
    (a) => acoesPossiveis(s.status as Status).includes(a) && u.permissoes.has(PERMISSAO_DA_ACAO[a]),
  );
  let bloqueioAprovar: string | undefined;
  if (s.restrita) bloqueioAprovar = 'Envio restrito (possível dado pessoal): não pode ser aprovado.';
  else if (segregacao && (s.enviadoPor === u.id || s.criadoPor === u.id)) bloqueioAprovar = 'Segregação de funções: você enviou este envio.';
  else if (d.pendencias.some((p) => p.status === 'aberta')) bloqueioAprovar = 'Há pendências abertas.';
  const achadosPorLinha = new Map<number, string[]>();
  for (const a of d.relatorio?.achados ?? []) {
    if (a.linha) achadosPorLinha.set(a.linha, [...(achadosPorLinha.get(a.linha) ?? []), a.mensagem]);
  }
  return (
    <Pagina
      titulo={`Análise ${s.protocolo ?? ''}`}
      descricao={`${d.entidade.nome} · ${s.periodoInicio ? `${fmtData(s.periodoInicio)} a ${fmtData(s.periodoFim!)}` : ''} · ${s.tipoEntrada === 'formulario' ? 'Formulário' : s.tipoEntrada.toUpperCase()} · Modelo ${d.modelo.id} v${d.modelo.versao}`}
    >
      <div className="omv-linha">
        <StatusBadge status={s.status} />
        {s.restrita ? <StatusBadge status="restrito" /> : null}
        {s.enviadoEm ? <span className="omv-legenda">Recebido em {fmtDataHora(s.enviadoEm)}</span> : null}
      </div>
      {s.restrita ? (
        <Banner tipo="erro" titulo="Envio restrito">
          Foi detectado possível dado pessoal. O conteúdo foi redigido nas telas e não aparece em notificações ou registros de auditoria. O envio não pode ser aprovado.
          {u.permissoes.has('analise:dados_restritos') ? <VerOriginal id={id} /> : null}
        </Banner>
      ) : null}
      <PainelDecisao id={id} acoes={acoes} bloqueioAprovar={bloqueioAprovar} />
      <Cartao titulo="Relatório de validação">{d.relatorio ? <RelatorioView r={d.relatorio} /> : <p>Sem relatório.</p>}</Cartao>
      <Cartao titulo={`Registros recebidos (${d.linhas.length})`}>
        <Table legenda="Registros recebidos, com destaque para linhas com alertas">
          <thead>
            <tr>
              <th>#</th>
              <th>Período</th>
              <th>Bairro</th>
              <th>Tipo</th>
              <th>Unidade</th>
              <th>Categoria</th>
              <th>Faixa etária</th>
              <th className="num">Qtd.</th>
              <th>Observações da validação</th>
            </tr>
          </thead>
          <tbody>
            {d.linhas.map((l) => {
              const n = l.dados.normalizada as Record<string, unknown>;
              const msgs = achadosPorLinha.get(l.linha) ?? [];
              return (
                <tr key={l.id} style={msgs.length ? { background: 'var(--pendente-suave)' } : undefined}>
                  <td>{l.linha}</td>
                  <td>{n.periodo_inicio ? fmtData(String(n.periodo_inicio)) : '—'}</td>
                  <td>{bairros.find((b) => b.codigo === n.bairro)?.nome ?? '—'}</td>
                  <td>{rot('tipo_registro', n.tipo_registro)}</td>
                  <td>{rot('unidade_contagem', n.unidade_contagem)}</td>
                  <td>{rot('categoria_violencia', n.categoria_violencia)}</td>
                  <td>{rot('faixa_etaria', n.faixa_etaria)}</td>
                  <td className="num">{fmtNumero(Number(n.quantidade))}</td>
                  <td className="omv-legenda">{msgs.join(' ')}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Cartao>
      <Colaboracao
        id={id}
        podeComentar={u.permissoes.has('analise:comentar')}
        pendencias={d.pendencias.map((p) => ({ id: p.id, linha: p.linha, descricao: p.descricao, status: p.status }))}
        comentarios={d.comentarios.map((c) => ({ id: c.id, texto: c.texto, quando: fmtDataHora(c.criadoEm), visivelEntidade: c.visivelEntidade }))}
      />
      <Cartao titulo="Histórico de decisões">
        <ul style={{ margin: 0 }}>
          {d.decisoes.map((x) => (
            <li key={x.id}>
              {fmtDataHora(x.criadoEm)} — <strong>{x.acao}</strong> ({x.deStatus} → {x.paraStatus}){x.justificativa ? `: ${x.justificativa}` : ''}
            </li>
          ))}
        </ul>
      </Cartao>
    </Pagina>
  );
}
