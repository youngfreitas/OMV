'use client';

import { useActionState, type ReactNode } from 'react';
import { Banner, Button, SelectField, TextField } from '@/components/ds';
import { NOMES_DOMINIOS, ROTULOS_DOMINIO } from '@/lib/dicionario/dominios';
import { bairroAcao, classificacaoAcao, regiaoAcao, tagAcao } from './acoes';

type Acao = (p: unknown, fd: FormData) => Promise<{ ok: boolean; erro?: string }>;

function Formulario({ acao, titulo, children }: { acao: Acao; titulo: string; children: ReactNode }) {
  const [r, a, pendente] = useActionState(acao, undefined);
  const resp = r as { ok: boolean; erro?: string } | undefined;
  return (
    <form action={a} className="form-pilha" aria-label={titulo}>
      {resp && !resp.ok ? <Banner tipo="erro">{resp.erro}</Banner> : null}
      {resp?.ok ? <Banner tipo="info">Salvo.</Banner> : null}
      <div className="omv-form-grid">{children}</div>
      <label className="omv-check"><input type="checkbox" name="provisorio" defaultChecked /> Provisório (aguarda validação)</label>
      <label className="omv-check"><input type="checkbox" name="ativo" defaultChecked /> Ativo</label>
      <div><Button type="submit" disabled={pendente} icon="mais">{titulo}</Button></div>
    </form>
  );
}

export function FormClassificacao() {
  return (
    <Formulario acao={classificacaoAcao as Acao} titulo="Salvar classificação">
      <SelectField name="dominio" label="Domínio" options={NOMES_DOMINIOS.map((d) => ({ value: d, label: ROTULOS_DOMINIO[d] }))} />
      <TextField name="codigo" label="Código" hint="Se já existir, atualiza." required />
      <TextField name="rotulo" label="Rótulo" required />
      <TextField name="ordem" label="Ordem" type="number" defaultValue="0" />
      <TextField name="definicao" label="Definição (opcional)" />
    </Formulario>
  );
}
export function FormRegiao() {
  return (
    <Formulario acao={regiaoAcao as Acao} titulo="Salvar região">
      <TextField name="codigo" label="Código" required />
      <TextField name="nome" label="Nome" required />
    </Formulario>
  );
}
export function FormBairro({ regioes }: { regioes: Array<{ value: string; label: string }> }) {
  return (
    <Formulario acao={bairroAcao as Acao} titulo="Salvar bairro">
      <TextField name="codigo" label="Código" required />
      <TextField name="nome" label="Nome" required />
      <SelectField name="regiaoId" label="Região" options={[{ value: '', label: 'Sem região' }, ...regioes]} />
    </Formulario>
  );
}
export function FormTag() {
  const [r, a, pendente] = useActionState(tagAcao as Acao, undefined);
  const resp = r as { ok: boolean; erro?: string } | undefined;
  return (
    <form action={a} className="form-pilha" aria-label="Nova etiqueta">
      {resp && !resp.ok ? <Banner tipo="erro">{resp.erro}</Banner> : null}
      <TextField name="nome" label="Nova etiqueta" required />
      <div><Button type="submit" disabled={pendente} icon="mais">Adicionar etiqueta</Button></div>
    </form>
  );
}
