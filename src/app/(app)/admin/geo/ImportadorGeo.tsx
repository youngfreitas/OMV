'use client';

import { useState, useTransition } from 'react';
import { Banner, Button, SelectField, TextField, useToast } from '@/components/ds';
import type { AnaliseGeo } from '@/lib/geo/importador';
import { desativarAcao, enviarBaseAcao, ligarAcao } from './acoes';

export function LinhaBase({ id, ativa }: { id: string; ativa: boolean }) {
  const [, t] = useTransition();
  const toast = useToast();
  if (!ativa) return null;
  return (
    <Button size="sm" variant="danger" onClick={() => t(async () => { const r = await desativarAcao(id); if (r.ok) window.location.reload(); else toast('erro', r.erro); })}>
      Desativar
    </Button>
  );
}

export function ImportadorGeo({ bairros }: { bairros: Array<{ id: string; nome: string }> }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<{ baseId: string; analise: AnaliseGeo; ligacao: Record<string, string> } | null>(null);
  const toast = useToast();

  return (
    <div className="omv-painel form-pilha">
      <h2>Importar GeoJSON de bairros</h2>
      {erro ? <Banner tipo="erro">{erro}</Banner> : null}
      {!etapa ? (
        <form
          className="form-pilha"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            iniciar(async () => {
              const r = await enviarBaseAcao(fd);
              if (!r.ok) return setErro(r.erro);
              setErro(null);
              setEtapa({ baseId: r.baseId, analise: r.analise, ligacao: r.ligacaoSugerida });
            });
          }}
        >
          <div className="omv-form-grid">
            <input type="file" name="arquivo" accept=".geojson,.json" aria-label="Arquivo GeoJSON" className="omv-input" style={{ height: 'auto', padding: 12 }} required />
            <TextField name="versao" label="Versão da base" placeholder="ex.: 2026.1" required />
            <TextField name="fonte" label="Fonte (órgão, documento e data)" required />
          </div>
          <label className="omv-check"><input type="checkbox" name="oficial" /> Base oficial validada pela Prefeitura</label>
          <div><Button type="submit" icon="subir" disabled={pendente}>Analisar arquivo</Button></div>
        </form>
      ) : (
        <div className="form-pilha">
          {etapa.analise.avisos.map((a) => <Banner key={a} tipo="alerta">{a}</Banner>)}
          <p>{etapa.analise.features.length} feição(ões) encontradas. Ligue cada feição ao bairro correspondente (a sugestão usa o nome).</p>
          <table className="omv-table">
            <thead><tr><th>Feição</th><th>Bairro do cadastro</th></tr></thead>
            <tbody>
              {etapa.analise.features.map((f) => (
                <tr key={f.id}>
                  <td>{f.nome} <span className="omv-legenda">({f.id})</span></td>
                  <td>
                    <SelectField aria-label={`Bairro para ${f.nome}`} value={etapa.ligacao[f.id] ?? ''} options={[{ value: '', label: '— sem ligação —' }, ...bairros.map((b) => ({ value: b.id, label: b.nome }))]}
                      onChange={(e) => setEtapa({ ...etapa, ligacao: { ...etapa.ligacao, [f.id]: e.target.value } })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="omv-linha">
            {[true, false].map((ativar) => (
              <Button key={String(ativar)} variant={ativar ? 'primary' : 'secondary'} disabled={pendente} onClick={() => iniciar(async () => {
                const lig = Object.fromEntries(Object.entries(etapa.ligacao).filter(([, v]) => v));
                const r = await ligarAcao(etapa.baseId, lig, ativar);
                if (r.ok) window.location.reload(); else toast('erro', r.erro);
              })}>
                {ativar ? 'Salvar ligações e ativar no mapa' : 'Salvar sem ativar'}
              </Button>
            ))}
            <Button variant="ghost" onClick={() => setEtapa(null)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
