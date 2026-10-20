'use client';

import { useState, useTransition } from 'react';
import { Banner, Button, Cartao, Modal, TextArea, useToast } from '@/components/ds';
import { acaoFluxoAcao, comentarAcao, pendenciaAcao, resolverPendenciaAcao, verOriginalAcao } from '../acoes';
import type { Payload } from '@/server/submissoes';

const ROTULOS: Record<string, { texto: string; icone: string; variante: 'primary' | 'secondary' | 'danger'; exige: boolean }> = {
  iniciar_analise: { texto: 'Iniciar análise', icone: 'em-analise', variante: 'secondary', exige: false },
  aprovar: { texto: 'Aprovar', icone: 'confirmar', variante: 'primary', exige: false },
  devolver: { texto: 'Devolver para correção', icone: 'seta-esquerda', variante: 'secondary', exige: true },
  rejeitar: { texto: 'Rejeitar', icone: 'fechar', variante: 'danger', exige: true },
  retirar: { texto: 'Retirar da base analítica', icone: 'arquivar', variante: 'danger', exige: true },
};

export function PainelDecisao({ id, acoes, bloqueioAprovar }: { id: string; acoes: string[]; bloqueioAprovar?: string }) {
  const [ativa, setAtiva] = useState<string | null>(null);
  const [just, setJust] = useState('');
  const [pend, setPend] = useState('');
  const [pendente, iniciar] = useTransition();
  const toast = useToast();
  if (!acoes.length) return null;

  const executar = (acao: string) =>
    iniciar(async () => {
      const pendencias = acao === 'devolver' ? pend.split('\n').map((x) => x.trim()).filter(Boolean).map((descricao) => ({ descricao })) : undefined;
      const r = await acaoFluxoAcao(id, acao, { justificativa: just, pendencias });
      if (r.ok) {
        toast('ok', 'Ação registrada.');
        setAtiva(null);
        setJust('');
        setPend('');
        window.location.reload();
      } else toast('erro', r.erro);
    });

  return (
    <Cartao titulo="Decisão">
      {bloqueioAprovar && acoes.includes('aprovar') ? <Banner tipo="alerta">{bloqueioAprovar}</Banner> : null}
      <div className="omv-linha" style={{ marginTop: 12 }}>
        {acoes.map((a) => {
          const r = ROTULOS[a]!;
          const desabilitada = a === 'aprovar' && !!bloqueioAprovar;
          return (
            <Button key={a} variant={r.variante} icon={r.icone} disabled={pendente || desabilitada} onClick={() => (r.exige || a === 'aprovar' ? setAtiva(a) : executar(a))}>
              {r.texto}
            </Button>
          );
        })}
      </div>
      <Modal
        aberto={ativa !== null}
        aoFechar={() => setAtiva(null)}
        titulo={ativa ? ROTULOS[ativa]!.texto : ''}
        rodape={
          <>
            <Button variant="secondary" onClick={() => setAtiva(null)}>Cancelar</Button>
            <Button variant={ativa && ROTULOS[ativa]!.variante === 'danger' ? 'danger' : 'primary'} disabled={pendente} onClick={() => ativa && executar(ativa)}>
              Confirmar
            </Button>
          </>
        }
      >
        {ativa === 'aprovar' ? <p>Ao aprovar, os registros passam à base analítica. A publicação pública continua sendo uma etapa separada.</p> : null}
        {ativa && ROTULOS[ativa]!.exige ? (
          <TextArea label="Justificativa (obrigatória)" value={just} onChange={(e) => setJust(e.target.value)} required hint="Visível para a entidade. Não inclua dados pessoais." />
        ) : null}
        {ativa === 'devolver' ? <TextArea label="Pendências (uma por linha)" value={pend} onChange={(e) => setPend(e.target.value)} hint="Cada linha vira uma pendência a ser atendida pela entidade." /> : null}
      </Modal>
    </Cartao>
  );
}

export function Colaboracao({
  id,
  podeComentar,
  pendencias,
  comentarios,
}: {
  id: string;
  podeComentar: boolean;
  pendencias: Array<{ id: string; linha: number | null; descricao: string; status: string }>;
  comentarios: Array<{ id: string; texto: string; quando: string; visivelEntidade: boolean }>;
}) {
  const [texto, setTexto] = useState('');
  const [visivel, setVisivel] = useState(true);
  const [novaPend, setNovaPend] = useState('');
  const [pendente, iniciar] = useTransition();
  const toast = useToast();
  const rodar = (fn: () => Promise<{ ok: boolean; erro?: string }>, ok: string) =>
    iniciar(async () => {
      const r = await fn();
      if (r.ok) {
        toast('ok', ok);
        window.location.reload();
      } else toast('erro', r.erro ?? 'Erro.');
    });
  return (
    <div className="omv-grid omv-grid-2">
      <Cartao titulo="Pendências">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {pendencias.length === 0 ? <li className="omv-muted">Nenhuma pendência.</li> : null}
          {pendencias.map((p) => (
            <li key={p.id}>
              {p.linha ? <strong>Linha {p.linha}: </strong> : null}
              {p.descricao} <em className="omv-legenda">({p.status === 'aberta' ? 'aberta' : 'resolvida'})</em>{' '}
              {podeComentar && p.status === 'aberta' ? (
                <button type="button" className="omv-btn omv-btn-ghost omv-btn-sm" onClick={() => rodar(() => resolverPendenciaAcao(id, p.id), 'Pendência resolvida.')}>
                  Marcar como resolvida
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {podeComentar ? (
          <div className="form-pilha" style={{ marginTop: 12 }}>
            <TextArea label="Nova pendência" value={novaPend} onChange={(e) => setNovaPend(e.target.value)} />
            <div>
              <Button size="sm" variant="secondary" icon="mais" disabled={pendente || !novaPend.trim()} onClick={() => rodar(() => pendenciaAcao(id, { descricao: novaPend }), 'Pendência criada.')}>
                Adicionar pendência
              </Button>
            </div>
          </div>
        ) : null}
      </Cartao>
      <Cartao titulo="Comentários técnicos">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {comentarios.length === 0 ? <li className="omv-muted">Nenhum comentário.</li> : null}
          {comentarios.map((c) => (
            <li key={c.id}>
              {c.texto} <span className="omv-legenda">— {c.quando}{c.visivelEntidade ? '' : ' · interno'}</span>
            </li>
          ))}
        </ul>
        {podeComentar ? (
          <div className="form-pilha" style={{ marginTop: 12 }}>
            <TextArea label="Novo comentário" value={texto} onChange={(e) => setTexto(e.target.value)} />
            <label className="omv-check">
              <input type="checkbox" checked={visivel} onChange={(e) => setVisivel(e.target.checked)} /> Visível para a entidade
            </label>
            <div>
              <Button size="sm" variant="secondary" icon="comentario" disabled={pendente || texto.trim().length < 3} onClick={() => rodar(() => comentarAcao(id, texto, visivel), 'Comentário registrado.')}>
                Comentar
              </Button>
            </div>
          </div>
        ) : null}
      </Cartao>
    </div>
  );
}

export function VerOriginal({ id }: { id: string }) {
  const [p, setP] = useState<Payload | null>(null);
  const [pendente, iniciar] = useTransition();
  const toast = useToast();
  return (
    <div style={{ marginTop: 8 }}>
      <Button size="sm" variant="secondary" icon="cadeado" disabled={pendente} onClick={() => iniciar(async () => {
        const r = await verOriginalAcao(id);
        if (r.ok) setP(r.payload);
        else toast('erro', r.erro);
      })}>
        Ver conteúdo original (acesso auditado)
      </Button>
      <Modal aberto={p !== null} aoFechar={() => setP(null)} titulo="Conteúdo original restrito" rodape={<Button onClick={() => setP(null)}>Fechar</Button>}>
        <p className="omv-legenda">Este acesso foi registrado na auditoria. Não copie nem repasse estes dados.</p>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{p ? JSON.stringify(p.linhas.slice(0, 50), null, 2) : ''}</pre>
      </Modal>
    </div>
  );
}
