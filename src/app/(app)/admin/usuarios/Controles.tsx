'use client';

import { useActionState, useState, useTransition } from 'react';
import { Banner, Button, Modal, SelectField, TextField, useToast } from '@/components/ds';
import { alternarUsuarioAcao, criarUsuarioAcao, redefinirMfaAcao, redefinirSenhaAcao } from '../acoes';

const PERFIS = [
  { value: 'entidade', label: 'Entidade' },
  { value: 'analista', label: 'Analista' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'visualizador', label: 'Visualizador interno' },
  { value: 'administrador', label: 'Administrador' },
];

export function FormUsuario({ entidades }: { entidades: Array<{ value: string; label: string }> }) {
  const [r, acao, pendente] = useActionState(criarUsuarioAcao, undefined);
  const resp = r as { ok: boolean; erro?: string; senhaTemporaria?: string } | undefined;
  const [perfil, setPerfil] = useState('entidade');
  return (
    <form action={acao} className="form-pilha">
      {resp && !resp.ok ? <Banner tipo="erro">{resp.erro}</Banner> : null}
      {resp?.ok ? (
        <Banner tipo="alerta" titulo="Usuário criado">
          Senha temporária (exibida uma única vez; a troca é obrigatória no primeiro acesso): <code>{resp.senhaTemporaria}</code>
        </Banner>
      ) : null}
      <div className="omv-form-grid">
        <TextField name="nome" label="Nome" required />
        <TextField name="email" type="email" label="E-mail" required />
        <SelectField name="papel" label="Perfil" options={PERFIS} value={perfil} onChange={(e) => setPerfil(e.target.value)} />
        {perfil === 'entidade' ? (
          <SelectField name="entidadeId" label="Entidade" options={entidades} placeholder="Selecione" required />
        ) : null}
      </div>
      <div>
        <Button type="submit" disabled={pendente} icon="mais">Cadastrar usuário</Button>
      </div>
    </form>
  );
}

export function AcoesUsuario({ id, ativo, proprio }: { id: string; ativo: boolean; proprio: boolean }) {
  const [, t] = useTransition();
  const toast = useToast();
  const [senha, setSenha] = useState<string | null>(null);
  return (
    <div className="omv-linha">
      <Button
        size="sm"
        variant="secondary"
        onClick={() =>
          t(async () => {
            const r = await redefinirSenhaAcao(id);
            if (r.ok) setSenha(r.senhaTemporaria);
            else toast('erro', r.erro);
          })
        }
      >
        Redefinir senha
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() =>
          t(async () => {
            const r = await redefinirMfaAcao(id);
            toast(r.ok ? 'ok' : 'erro', r.ok ? 'MFA redefinido.' : r.erro);
          })
        }
      >
        Redefinir MFA
      </Button>
      {!proprio ? (
        <Button
          size="sm"
          variant={ativo ? 'danger' : 'secondary'}
          onClick={() =>
            t(async () => {
              const r = await alternarUsuarioAcao(id, !ativo);
              if (!r.ok) toast('erro', r.erro);
            })
          }
        >
          {ativo ? 'Desativar' : 'Reativar'}
        </Button>
      ) : null}
      <Modal aberto={senha !== null} aoFechar={() => setSenha(null)} titulo="Senha temporária" rodape={<Button onClick={() => setSenha(null)}>Fechar</Button>}>
        <p>Entregue esta senha por um canal seguro. Ela não será exibida novamente e deve ser trocada no primeiro acesso.</p>
        <code style={{ fontSize: 18 }}>{senha}</code>
      </Modal>
    </div>
  );
}
