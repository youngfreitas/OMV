import { Banner, Pagina, StatusBadge, Table, Tabs } from '@/components/ds';
import { requirePermission } from '@/lib/auth/guards';
import { ROTULOS_DOMINIO, type NomeDominio } from '@/lib/dicionario/dominios';
import { dadosCadastros } from '@/server/cadastros-admin';
import { FormBairro, FormClassificacao, FormRegiao, FormTag } from './Forms';

export const metadata = { title: 'Cadastros' };

export default async function Cadastros() {
  const u = await requirePermission('cadastros:gerenciar');
  const d = await dadosCadastros(u);
  const nomeRegiao = (id: string | null) => d.regioes.find((r) => r.id === id)?.nome ?? '—';
  return (
    <Pagina titulo="Cadastros" descricao="Classificações, etiquetas, regiões e bairros usados em formulários, validações e indicadores. Itens PROVISÓRIOS aguardam validação da Secretaria.">
      <Banner tipo="alerta" titulo="Atenção">Desativar um item o retira dos formulários e modelos novos; registros já aprovados mantêm o código original.</Banner>
      <Tabs
        rotulo="Cadastros"
        abas={[
          {
            titulo: 'Classificações',
            conteudo: (
              <div className="form-pilha" style={{ gap: 24 }}>
                <FormClassificacao />
                <Table legenda="Classificações">
                  <thead><tr><th>Domínio</th><th>Código</th><th>Rótulo</th><th>Ordem</th><th>Situação</th></tr></thead>
                  <tbody>
                    {d.classificacoes.map((c) => (
                      <tr key={c.id}>
                        <td>{ROTULOS_DOMINIO[c.dominio as NomeDominio] ?? c.dominio}</td>
                        <td><code>{c.codigo}</code></td>
                        <td>{c.rotulo}</td>
                        <td>{c.ordem}</td>
                        <td>
                          <StatusBadge status={c.ativo ? 'aprovado' : 'arquivado'}>{c.ativo ? 'Ativo' : 'Inativo'}</StatusBadge> {c.provisorio ? <StatusBadge status="em_analise">Provisório</StatusBadge> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ),
          },
          {
            titulo: 'Regiões',
            conteudo: (
              <div className="form-pilha" style={{ gap: 24 }}>
                <FormRegiao />
                <Table legenda="Regiões">
                  <thead><tr><th>Código</th><th>Nome</th><th>Situação</th></tr></thead>
                  <tbody>
                    {d.regioes.map((r) => (
                      <tr key={r.id}><td><code>{r.codigo}</code></td><td>{r.nome}</td><td>{r.ativo ? 'Ativa' : 'Inativa'} {r.provisorio ? '· provisória' : ''}</td></tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ),
          },
          {
            titulo: 'Bairros',
            conteudo: (
              <div className="form-pilha" style={{ gap: 24 }}>
                <FormBairro regioes={d.regioes.map((r) => ({ value: r.id, label: r.nome }))} />
                <Table legenda="Bairros">
                  <thead><tr><th>Código</th><th>Nome</th><th>Região</th><th>Feature no mapa</th><th>Situação</th></tr></thead>
                  <tbody>
                    {d.bairros.map((b) => (
                      <tr key={b.id}><td><code>{b.codigo}</code></td><td>{b.nome}</td><td>{nomeRegiao(b.regiaoId)}</td><td>{b.geoFeatureId ?? '—'}</td><td>{b.ativo ? 'Ativo' : 'Inativo'} {b.provisorio ? '· provisório' : ''}</td></tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ),
          },
          {
            titulo: 'Etiquetas',
            conteudo: (
              <div className="form-pilha" style={{ gap: 24 }}>
                <FormTag />
                <ul>{d.tags.map((t) => <li key={t.id}>{t.nome}</li>)}</ul>
              </div>
            ),
          },
        ]}
      />
    </Pagina>
  );
}
