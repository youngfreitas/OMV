import { Pagina } from '@/components/ds';
import { FormularioEnvio } from '@/components/envio/FormularioEnvio';
import { requirePermission } from '@/lib/auth/guards';
import { carregarBairros, carregarDominios } from '@/server/cadastros';

export const metadata = { title: 'Novo envio' };

export default async function NovoEnvio() {
  const u = await requirePermission('submissao:criar');
  const [dominios, bairros] = await Promise.all([carregarDominios(), carregarBairros()]);
  return (
    <Pagina titulo="Novo envio" descricao="Informe apenas números agregados. Nunca registre dados que identifiquem a pessoa atendida.">
      <FormularioEnvio entidadeId={u.entidadeId ?? ''} dominios={dominios} bairros={bairros.map((b) => ({ codigo: b.codigo, nome: b.nome }))} />
    </Pagina>
  );
}
