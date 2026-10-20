'use client';

import { useEffect, useState, useTransition } from 'react';
import { Button, Drawer, StatusBadge, Table, useToast } from '@/components/ds';
import { fmtNumero } from '@/lib/formato';
import { alternarTagAcao, detalheRegistroAcao, type DetalheRegistro } from './acoes';

type Linha = {
  id: string; periodo: string; entidade: string; bairro: string | null; regiao: string | null; tipoRegistroRotulo: string; unidadeRotulo: string;
  categoriaRotulo: string; faixaRotulo: string; quantidade: number | null; ativo: boolean;
};

const COLUNAS = [
  ['periodo', 'Período'], ['entidade', 'Entidade'], ['bairro', 'Território'], ['tipo', 'Tipo'], ['unidade', 'Unidade'],
  ['categoria', 'Categoria'], ['faixa', 'Faixa etária'], ['quantidade', 'Quantidade'], ['situacao', 'Situação'],
] as const;

export function TabelaMonitor({ linhas, k, ordem, dir, linkOrdem, podeEtiquetar }: { linhas: Linha[]; k: number; ordem: string; dir: string; linkOrdem: Record<string, string>; podeEtiquetar: boolean }) {
  const [ocultas, setOcultas] = useState<string[]>([]);
  const [det, setDet] = useState<DetalheRegistro | null>(null);
  const [, iniciar] = useTransition();
  const toast = useToast();
  useEffect(() => {
    try {
      const v = localStorage.getItem('omv-colunas-monitor');
      if (v) setOcultas(JSON.parse(v));
    } catch {}
  }, []);
  const alternar = (c: string) =>
    setOcultas((o) => {
      const n = o.includes(c) ? o.filter((x) => x !== c) : [...o, c];
      try { localStorage.setItem('omv-colunas-monitor', JSON.stringify(n)); } catch {}
      return n;
    });
  const vis = (c: string) => !ocultas.includes(c);
  const ordenavel = (c: string, r: string) =>
    linkOrdem[c] ? (
      <a href={linkOrdem[c]} aria-label={`Ordenar por ${r}`}>
        {r} {ordem === c ? (dir === 'asc' ? '▲' : '▼') : ''}
      </a>
    ) : (
      r
    );
  return (
    <>
      <details>
        <summary style={{ cursor: 'pointer' }}>Colunas visíveis</summary>
        <div className="omv-linha" style={{ padding: '8px 0' }}>
          {COLUNAS.map(([c, r]) => (
            <label key={c} className="omv-check">
              <input type="checkbox" checked={vis(c)} onChange={() => alternar(c)} /> {r}
            </label>
          ))}
        </div>
      </details>
      <Table legenda="Registros aprovados">
        <thead>
          <tr>
            {vis('periodo') ? <th>{ordenavel('periodo', 'Período')}</th> : null}
            {vis('entidade') ? <th>Entidade</th> : null}
            {vis('bairro') ? <th>Território</th> : null}
            {vis('tipo') ? <th>Tipo</th> : null}
            {vis('unidade') ? <th>{ordenavel('unidade', 'Unidade')}</th> : null}
            {vis('categoria') ? <th>{ordenavel('categoria', 'Categoria')}</th> : null}
            {vis('faixa') ? <th>Faixa etária</th> : null}
            {vis('quantidade') ? <th className="num">{ordenavel('quantidade', 'Quantidade')}</th> : null}
            {vis('situacao') ? <th>Situação</th> : null}
            <th />
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id}>
              {vis('periodo') ? <td>{l.periodo}</td> : null}
              {vis('entidade') ? <td>{l.entidade}</td> : null}
              {vis('bairro') ? <td>{l.bairro ?? l.regiao ?? '—'}</td> : null}
              {vis('tipo') ? <td>{l.tipoRegistroRotulo}</td> : null}
              {vis('unidade') ? <td>{l.unidadeRotulo}</td> : null}
              {vis('categoria') ? <td>{l.categoriaRotulo}</td> : null}
              {vis('faixa') ? <td>{l.faixaRotulo}</td> : null}
              {vis('quantidade') ? <td className="num">{l.quantidade === null ? `< ${k}` : fmtNumero(l.quantidade)}</td> : null}
              {vis('situacao') ? <td><StatusBadge status={l.ativo ? 'aprovado' : 'retirado'}>{l.ativo ? 'Ativo' : 'Retirado'}</StatusBadge></td> : null}
              <td>
                <Button size="sm" variant="ghost" icon="ver" onClick={() => iniciar(async () => { const r = await detalheRegistroAcao(l.id); if (r.ok) setDet(r.detalhe); else toast('erro', r.erro); })}>
                  Detalhe
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Drawer aberto={det !== null} aoFechar={() => setDet(null)} titulo="Detalhe do registro">
        {det ? (
          <div className="form-pilha">
            <p><strong>Envio:</strong> <a href={`/analise/${det.submissaoId}`}>{det.protocolo}</a></p>
            <p><strong>Aprovado em:</strong> {det.aprovadoEm}</p>
            <p><strong>Quantidade:</strong> {det.quantidade === null ? `< ${k}` : fmtNumero(det.quantidade)}</p>
            <h3>Etiquetas</h3>
            <div className="omv-linha">
              {det.tags.map((t) => (
                <Button key={t.id} size="sm" variant={t.aplicada ? 'primary' : 'secondary'} disabled={!podeEtiquetar}
                  onClick={() => iniciar(async () => { const r = await alternarTagAcao(det.id, t.id); if (r.ok) { setDet({ ...det, tags: det.tags.map((x) => (x.id === t.id ? { ...x, aplicada: !x.aplicada } : x)) }); } else toast('erro', r.erro); })}>
                  {t.nome}
                </Button>
              ))}
              {det.tags.length === 0 ? <span className="omv-muted">Nenhuma etiqueta cadastrada.</span> : null}
            </div>
            <h3>Histórico</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {det.historico.map((h, i) => (<li key={i}>{h.quando} — {h.acao}</li>))}
            </ul>
          </div>
        ) : null}
      </Drawer>
    </>
  );
}
