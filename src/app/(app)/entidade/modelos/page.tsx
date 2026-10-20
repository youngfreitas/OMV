import { LinkCard, Pagina, Table } from '@/components/ds';
import { requirePermission } from '@/lib/auth/guards';
import { CAMPOS_LINHA, ID_MODELO, VERSAO_MODELO } from '@/lib/dicionario/campos';

export const metadata = { title: 'Modelos de preenchimento' };

const FORMATOS = [
  { f: 'xlsx', icon: 'tabela', titulo: 'Planilha (.xlsx)', d: 'Listas suspensas, validação de datas e quantidades. Recomendado.' },
  { f: 'csv', icon: 'arquivo', titulo: 'CSV (.csv)', d: 'Texto separado por ponto e vírgula, codificação UTF-8.' },
  { f: 'docx', icon: 'relatorios', titulo: 'Documento (.docx)', d: 'Tabela no Word; use apenas a tabela de dados.' },
  { f: 'md', icon: 'editar', titulo: 'Markdown (.md)', d: 'Tabela em texto simples, para quem prefere editores de texto.' },
];

export default async function Modelos() {
  await requirePermission('submissao:criar', 'submissao:importar', 'analise:ler');
  return (
    <Pagina titulo="Modelos de preenchimento" descricao={`Modelo ${ID_MODELO} · versão ${VERSAO_MODELO}. Os quatro formatos têm os mesmos campos e a mesma validação.`}>
      <div className="omv-grid omv-grid-2">
        {FORMATOS.map((x) => (
          <LinkCard key={x.f} href={`/api/modelos/${x.f}`} icon={x.icon} label={`Baixar ${x.titulo}`} description={x.d} />
        ))}
      </div>
      <div className="omv-painel">
        <h2>Campos do modelo</h2>
        <p className="omv-muted">Importações nunca são aprovadas ou publicadas automaticamente: o arquivo vira um rascunho que você revisa e confirma.</p>
        <Table legenda="Campos do modelo">
          <thead>
            <tr>
              <th>Campo</th>
              <th>Obrigatório</th>
              <th>Orientação</th>
              <th>Exemplo</th>
            </tr>
          </thead>
          <tbody>
            {CAMPOS_LINHA.map((c) => (
              <tr key={c.chave}>
                <td>
                  <strong>{c.rotulo}</strong>
                  <br />
                  <code className="omv-legenda">{c.chave}</code>
                </td>
                <td>{c.obrigatorio ? 'Sim' : c.condicional ? 'Condicional' : 'Não'}</td>
                <td>{c.ajuda}</td>
                <td>{c.exemplo || '—'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Pagina>
  );
}
