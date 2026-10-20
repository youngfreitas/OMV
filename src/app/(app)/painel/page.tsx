import { Banner, LinkCard, Pagina } from '@/components/ds';
import { requireUser, temPermissao } from '@/lib/auth/guards';

export const metadata = { title: 'Início' };

export default async function Painel() {
  const u = await requireUser();
  const atalhos = [
    { p: 'submissao:criar' as const, href: '/entidade/novo', icon: 'mais', label: 'Novo envio', d: 'Preencher o formulário de dados agregados' },
    { p: 'submissao:importar' as const, href: '/entidade/importar', icon: 'subir', label: 'Importar arquivo', d: 'CSV, XLSX, DOCX ou Markdown' },
    { p: 'submissao:ler_proprias' as const, href: '/entidade/envios', icon: 'ocorrencias', label: 'Meus envios', d: 'Acompanhar situação e pendências' },
    { p: 'analise:ler' as const, href: '/analise', icon: 'em-analise', label: 'Fila de análise', d: 'Revisar envios recebidos' },
    { p: 'dados:ver_agregado' as const, href: '/dashboard', icon: 'indicadores', label: 'Dashboard', d: 'Indicadores com regras de privacidade' },
    { p: 'monitoramento:ler' as const, href: '/monitoramento', icon: 'tabela', label: 'Monitoramento', d: 'Tabela de registros aprovados' },
    { p: 'publicacao:ler' as const, href: '/admin/publicacao', icon: 'publicar', label: 'Publicação', d: 'Indicadores publicados no portal' },
  ].filter((a) => temPermissao(u, a.p));
  return (
    <Pagina titulo={`Olá, ${u.nome.split(' ')[0]}`} descricao="Escolha uma tarefa para começar.">
      <Banner tipo="info" titulo="Somente dados agregados">
        Nenhum dado pessoal da pessoa atendida deve ser informado no OMV: nem nome, documento, telefone, e-mail ou endereço.
      </Banner>
      <div className="omv-grid omv-grid-3">
        {atalhos.map((a) => (
          <LinkCard key={a.href} href={a.href} icon={a.icon} label={a.label} description={a.d} />
        ))}
      </div>
    </Pagina>
  );
}
