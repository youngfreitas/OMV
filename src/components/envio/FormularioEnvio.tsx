'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { Banner, Button, Cartao, Icon, SelectField, Stepper, TextArea, TextField, useToast } from '@/components/ds';
import { CAMPOS_LINHA, DECLARACAO_SEM_DADOS_PESSOAIS, type LinhaBruta } from '@/lib/dicionario/campos';
import type { Dominios } from '@/lib/dicionario/dominios';
import { validarEnvio, podeEnviar } from '@/lib/validacao/regras';
import { RelatorioView } from '@/components/envio/Relatorio';
import { enviarAcao, reenviarAcao, salvarRascunhoAcao } from '@/app/(app)/entidade/acoes';

const ETAPAS = ['Período', 'Registros', 'Revisão e envio'];
const CAMPOS_FORM = CAMPOS_LINHA.filter((c) => c.chave !== 'periodo_inicio' && c.chave !== 'periodo_fim');

type Props = {
  entidadeId: string;
  dominios: Dominios;
  bairros: Array<{ codigo: string; nome: string }>;
  inicial?: { id?: string; cabecalho: LinhaBruta; linhas: LinhaBruta[]; reenvio?: boolean };
};

const vazia = (): LinhaBruta => ({ unidade_contagem: 'atendimento', tipo_registro: 'atendimento_servico' });

export function FormularioEnvio({ entidadeId, dominios, bairros, inicial }: Props) {
  const toast = useToast();
  const [etapa, setEtapa] = useState(0);
  const [id, setId] = useState(inicial?.id);
  const [cab, setCab] = useState<LinhaBruta>(inicial?.cabecalho ?? { periodo_inicio: '', periodo_fim: '', observacao_geral: '' });
  const [linhas, setLinhas] = useState<LinhaBruta[]>(inicial?.linhas?.length ? inicial.linhas : [vazia()]);
  const [declaracao, setDeclaracao] = useState(false);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const hoje = useRef(new Date());

  // Validação em tempo real (mesma função pura usada no servidor).
  const ctx = useMemo(
    () => ({ dominios, bairros: bairros.map((b) => ({ ...b, ativo: true })), hoje: hoje.current, entidadeId }),
    [dominios, bairros, entidadeId],
  );
  const { indices, validacao } = useMemo(() => {
    const idx: number[] = [];
    linhas.forEach((l, i) => {
      if (Object.entries(l).some(([k, v]) => !['unidade_contagem', 'tipo_registro'].includes(k) && (v ?? '').trim() !== '')) idx.push(i);
    });
    const v = validarEnvio({ cabecalho: cab, linhas: idx.map((i) => linhas[i]!) }, ctx);
    return { indices: idx, validacao: v };
  }, [cab, linhas, ctx]);
  const rel = validacao.relatorio;

  const erroDe = (i: number, campo: string) => {
    const n = indices.indexOf(i) + 1;
    return n > 0 ? rel.achados.find((a) => a.nivel === 'erro' && a.linha === n && a.campo === campo)?.mensagem : undefined;
  };

  const setLinha = (i: number, k: string, v: string) =>
    setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v, ...(k === 'tipo_registro' ? { unidade_contagem: '' } : {}) } : l)));

  const salvar = async (): Promise<string | null> => {
    const r = await salvarRascunhoAcao({ id, cabecalho: cab, linhas: linhas.filter((_, i) => indices.includes(i)).map((l) => ({ ...l })) });
    if (!r.ok) {
      setErroServidor(r.erro);
      toast('erro', r.erro);
      return null;
    }
    setErroServidor(null);
    setId(r.id);
    return r.id;
  };

  const irPara = (e: number) =>
    iniciar(async () => {
      if (etapa > 0 && e !== etapa && indices.length) await salvar();
      setEtapa(e);
    });

  const enviar = () =>
    iniciar(async () => {
      const salvo = await salvar();
      if (!salvo) return;
      const r = inicial?.reenvio ? await reenviarAcao(salvo, declaracao) : await enviarAcao(salvo, declaracao);
      if (!r.ok) {
        setErroServidor(r.erro);
        toast('erro', r.erro);
      } else setProtocolo(r.protocolo);
    });

  if (protocolo) {
    return (
      <Cartao titulo="Envio recebido">
        <Banner tipo="info" titulo={`Protocolo ${protocolo}`}>
          Guarde o protocolo. A equipe de análise revisará o envio; você será avisada(o) por notificação se houver pendências.
        </Banner>
        <div className="omv-linha" style={{ marginTop: 16 }}>
          <Button onClick={() => (window.location.href = '/entidade/envios')}>Ver meus envios</Button>
        </div>
      </Cartao>
    );
  }

  const unidadesPara = (tipo?: string) => {
    const t = dominios.tipo_registro?.find((x) => x.codigo === tipo);
    return (dominios.unidade_contagem ?? []).filter((u) => !t?.unidadesPermitidas || t.unidadesPermitidas.includes(u.codigo));
  };
  const opts = (d: string) => (dominios[d] ?? []).map((i) => ({ value: i.codigo, label: i.rotulo }));

  return (
    <div className="form-pilha" style={{ gap: 24 }}>
      <Stepper etapas={ETAPAS} atual={etapa} />
      {erroServidor ? <Banner tipo="erro">{erroServidor}</Banner> : null}
      {rel.restrita ? (
        <Banner tipo="erro" titulo="Possível dado pessoal detectado">
          Remova qualquer nome, documento, telefone, e-mail ou endereço. O envio ficará restrito e não poderá ser aprovado enquanto isso não for corrigido.
        </Banner>
      ) : null}

      {etapa === 0 ? (
        <Cartao titulo="Período de referência">
          <div className="omv-form-grid">
            <TextField label="Início do período" type="date" required value={cab.periodo_inicio ?? ''} onChange={(e) => setCab({ ...cab, periodo_inicio: e.target.value })} hint="Cada linha deve ficar dentro de um único mês." />
            <TextField label="Fim do período" type="date" required value={cab.periodo_fim ?? ''} onChange={(e) => setCab({ ...cab, periodo_fim: e.target.value })} />
          </div>
          <div style={{ marginTop: 16 }}>
            <TextArea label="Observação geral (opcional)" value={cab.observacao_geral ?? ''} maxLength={500} onChange={(e) => setCab({ ...cab, observacao_geral: e.target.value })} hint="Contexto metodológico. Não escreva dados pessoais." />
          </div>
          <div className="omv-linha" style={{ marginTop: 16 }}>
            <Button iconRight="seta-direita" disabled={pendente || !cab.periodo_inicio || !cab.periodo_fim} onClick={() => irPara(1)}>
              Continuar
            </Button>
          </div>
        </Cartao>
      ) : null}

      {etapa === 1 ? (
        <>
          {linhas.map((l, i) => (
            <Cartao
              key={i}
              titulo={`Registro ${i + 1}`}
              acoes={
                <div className="omv-linha">
                  <Button size="sm" variant="ghost" icon="mais" onClick={() => setLinhas((ls) => [...ls.slice(0, i + 1), { ...l }, ...ls.slice(i + 1)])}>
                    Duplicar
                  </Button>
                  <Button size="sm" variant="ghost" icon="lixeira" disabled={linhas.length === 1} onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}>
                    Remover
                  </Button>
                </div>
              }
            >
              <div className="omv-form-grid">
                {CAMPOS_FORM.map((c) => {
                  const exigido = c.obrigatorio || (c.condicional?.valoresQueExigem?.includes(l.tipo_registro ?? '') ?? false);
                  const rotulo = c.rotulo + (!exigido ? ' (opcional)' : '');
                  const comum = { label: rotulo, required: exigido, hint: c.ajuda, error: erroDe(i, c.chave) };
                  if (c.chave === 'bairro')
                    return <SelectField key={c.chave} {...comum} placeholder="Selecione o bairro" options={bairros.map((b) => ({ value: b.nome, label: b.nome }))} value={l.bairro ?? ''} onChange={(e) => setLinha(i, 'bairro', e.target.value)} />;
                  if (c.tipo === 'dominio' && c.dominio && c.dominio !== 'bairro') {
                    const o = c.chave === 'unidade_contagem' ? unidadesPara(l.tipo_registro).map((u) => ({ value: u.codigo, label: u.rotulo })) : opts(c.dominio);
                    return <SelectField key={c.chave} {...comum} placeholder="Selecione" options={o} value={l[c.chave] ?? ''} onChange={(e) => setLinha(i, c.chave, e.target.value)} />;
                  }
                  if (c.tipo === 'inteiro')
                    return <TextField key={c.chave} {...comum} type="number" min={0} step={1} inputMode="numeric" value={l[c.chave] ?? ''} onChange={(e) => setLinha(i, c.chave, e.target.value)} />;
                  return <TextField key={c.chave} {...comum} maxLength={c.max} value={l[c.chave] ?? ''} onChange={(e) => setLinha(i, c.chave, e.target.value)} />;
                })}
              </div>
            </Cartao>
          ))}
          <div className="omv-linha">
            <Button variant="secondary" icon="mais" onClick={() => setLinhas((ls) => [...ls, vazia()])}>
              Novo registro
            </Button>
            <Button variant="ghost" icon="seta-esquerda" onClick={() => irPara(0)}>
              Voltar
            </Button>
            <Button iconRight="seta-direita" disabled={pendente || indices.length === 0} onClick={() => irPara(2)}>
              Revisar
            </Button>
          </div>
        </>
      ) : null}

      {etapa === 2 ? (
        <Cartao titulo="Revisão antes de enviar">
          <RelatorioView r={rel} />
          <div style={{ marginTop: 16 }}>
            <label className="omv-check">
              <input type="checkbox" checked={declaracao} onChange={(e) => setDeclaracao(e.target.checked)} />
              <span>{DECLARACAO_SEM_DADOS_PESSOAIS}</span>
            </label>
          </div>
          <div className="omv-linha" style={{ marginTop: 16 }}>
            <Button variant="secondary" icon="seta-esquerda" onClick={() => irPara(1)}>
              Corrigir
            </Button>
            <Button variant="secondary" icon="arquivar" disabled={pendente} onClick={() => iniciar(async () => void ((await salvar()) && toast('ok', 'Rascunho salvo.')))}>
              Salvar rascunho
            </Button>
            <Button icon="enviar" disabled={pendente || !podeEnviar(rel) || !declaracao} onClick={enviar}>
              {inicial?.reenvio ? 'Reenviar formulário' : 'Enviar formulário'}
            </Button>
          </div>
          {!podeEnviar(rel) ? (
            <p className="omv-legenda" style={{ marginTop: 8 }}>
              <Icon name="alerta" size={14} /> Corrija os erros apontados para liberar o envio.
            </p>
          ) : null}
        </Cartao>
      ) : null}
    </div>
  );
}
