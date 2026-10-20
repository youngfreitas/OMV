import { Banner, Pagina } from '@/components/ds';
import { requirePermission } from '@/lib/auth/guards';
import { listarConfiguracoes } from '@/server/cadastros-admin';
import { LinhaConfig } from './LinhaConfig';

export const metadata = { title: 'Configurações metodológicas' };

export default async function Configuracoes() {
  const u = await requirePermission('config:metodologia');
  const lista = await listarConfiguracoes(u);
  return (
    <Pagina titulo="Configurações metodológicas" descricao="Parâmetros que afetam privacidade, validação e retenção. Todos são PROVISÓRIOS até validação institucional; cada alteração é auditada.">
      <Banner tipo="alerta" titulo="Validação institucional pendente">Marque “validado” somente após aprovação da Secretaria e do encarregado de proteção de dados.</Banner>
      <div className="omv-painel form-pilha">
        {lista.map((c) => (
          <LinhaConfig key={c.chave} chave={c.chave} valor={c.valor} provisorio={c.provisorio} descricao={c.descricao ?? ''} />
        ))}
      </div>
    </Pagina>
  );
}
