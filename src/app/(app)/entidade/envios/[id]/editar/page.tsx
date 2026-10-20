import { notFound, redirect } from 'next/navigation';
import { Pagina } from '@/components/ds';
import { FormularioEnvio } from '@/components/envio/FormularioEnvio';
import { requirePermission } from '@/lib/auth/guards';
import { ErroNegocio } from '@/lib/auth/erros';
import { carregarBairros, carregarDominios } from '@/server/cadastros';
import { obterComAcesso, payloadParaEdicao } from '@/server/submissoes';

export const metadata = { title: 'Editar envio' };

export default async function EditarEnvio({ params }: { params: Promise<{ id: string }> }) {
  const u = await requirePermission('submissao:criar');
  const { id } = await params;
  let payload, sub;
  try {
    sub = await obterComAcesso(u, id);
    payload = await payloadParaEdicao(u, id);
  } catch (e) {
    if (e instanceof ErroNegocio) {
      if (e.codigo === 'nao_editavel') redirect(`/entidade/envios/${id}`);
      notFound();
    }
    throw e;
  }
  const [dominios, bairros] = await Promise.all([carregarDominios(), carregarBairros()]);
  return (
    <Pagina titulo={sub.protocolo ? `Corrigir envio ${sub.protocolo}` : 'Editar rascunho'} descricao="Ajuste as informações e confirme novamente.">
      <FormularioEnvio
        entidadeId={u.entidadeId ?? ''}
        dominios={dominios}
        bairros={bairros.map((b) => ({ codigo: b.codigo, nome: b.nome }))}
        inicial={{ id, cabecalho: payload.cabecalho, linhas: payload.linhas, reenvio: sub.status === 'pendente_correcao' }}
      />
    </Pagina>
  );
}
