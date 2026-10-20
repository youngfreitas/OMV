'use client';

import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtNumero } from '@/lib/formato';

export type Ponto = { rotulo: string; valor: number | null; suprimido?: boolean };

type Meta = { titulo: string; periodo: string; unidade: string; fonte: string; children?: ReactNode };

function Moldura({ titulo, periodo, unidade, fonte, children, tabela }: Meta & { tabela: Ponto[] }) {
  return (
    <figure className="omv-painel grafico">
      <figcaption>
        <h3>{titulo}</h3>
        <p className="omv-legenda">
          {periodo} · Unidade: {unidade}
        </p>
      </figcaption>
      {children}
      <p className="omv-legenda grafico-fonte">Fonte: {fonte}</p>
      <details>
        <summary>Ver como tabela</summary>
        <table className="omv-table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Categoria</th>
              <th className="num">Valor</th>
            </tr>
          </thead>
          <tbody>
            {tabela.map((p) => (
              <tr key={p.rotulo}>
                <td>{p.rotulo}</td>
                <td className="num">{p.suprimido ? 'suprimido' : p.valor === null ? '—' : fmtNumero(p.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

const eixo = { fill: 'var(--texto-suave)', fontSize: 12 };

export function GraficoBarras({ dados, horizontal = true, cor = 'var(--viz-1)', ...meta }: Meta & { dados: Ponto[]; horizontal?: boolean; cor?: string }) {
  const d = dados.map((p) => ({ ...p, rotuloEixo: p.suprimido ? `${p.rotulo} (suprimido)` : p.rotulo, v: p.suprimido ? 0 : (p.valor ?? 0) }));
  const altura = horizontal ? Math.max(180, d.length * 34 + 30) : 280;
  return (
    <Moldura {...meta} tabela={dados}>
      <div role="img" aria-label={`${meta.titulo}. ${dados.map((p) => `${p.rotulo}: ${p.suprimido ? 'suprimido' : fmtNumero(p.valor ?? 0)}`).join('; ')}`} style={{ width: '100%', height: altura }}>
        <ResponsiveContainer>
          <BarChart data={d} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
            <CartesianGrid stroke="var(--linha)" strokeDasharray="3 3" horizontal={!horizontal} vertical={horizontal} />
            {horizontal ? (
              <>
                <XAxis type="number" tick={eixo} stroke="var(--linha-forte)" allowDecimals={false} />
                <YAxis type="category" dataKey="rotuloEixo" width={170} tick={eixo} stroke="var(--linha-forte)" />
              </>
            ) : (
              <>
                <XAxis dataKey="rotuloEixo" tick={eixo} stroke="var(--linha-forte)" interval={0} angle={-45} textAnchor="end" height={64} />
                <YAxis tick={eixo} stroke="var(--linha-forte)" allowDecimals={false} />
              </>
            )}
            <Tooltip
              cursor={{ fill: 'var(--lilas-suave)' }}
              contentStyle={{ background: 'var(--fundo-elevado)', border: '1px solid var(--linha)', borderRadius: 10, color: 'var(--texto)' }}
              formatter={(_v, _n, item) => [item.payload.suprimido ? 'valor suprimido' : fmtNumero(item.payload.valor ?? 0), meta.unidade]}
            />
            <Bar dataKey="v" radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} fill={cor}>
              {d.map((p, i) => (
                <Cell key={i} fill={cor} fillOpacity={p.suprimido ? 0.15 : 1} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Moldura>
  );
}
