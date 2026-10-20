/** Catálogo de permissões e matriz padrão de perfis (ver docs/PERMISSOES.md). */
export const PERMISSOES = {
  'submissao:criar': 'Criar rascunhos e enviar formulários da própria entidade',
  'submissao:importar': 'Importar arquivos da própria entidade',
  'submissao:ler_proprias': 'Ver os envios da própria entidade',
  'submissao:ler_todas': 'Ver envios de todas as entidades',
  'analise:ler': 'Abrir a fila e a tela de análise',
  'analise:comentar': 'Registrar comentários técnicos e pendências',
  'analise:devolver': 'Devolver para correção',
  'analise:aprovar': 'Aprovar envios',
  'analise:rejeitar': 'Rejeitar envios',
  'analise:retirar': 'Retirar envio aprovado da base analítica',
  'analise:dados_restritos': 'Ver conteúdo de envios restritos (possível dado pessoal)',
  'dados:ver_agregado': 'Dashboard interno com regras de supressão',
  'dados:ver_nao_suprimido': 'Ver valores sem supressão no ambiente interno',
  'monitoramento:ler': 'Tabela de monitoramento',
  'relatorio:gerar': 'Gerar relatórios',
  'relatorio:exportar': 'Exportar PDF/XLSX',
  'publicacao:ler': 'Ver publicações',
  'publicacao:publicar': 'Gerar e publicar indicadores',
  'publicacao:retirar': 'Retirar publicação',
  'cadastros:gerenciar': 'Classificações, tags, bairros e regiões',
  'geo:gerenciar': 'Importar bases geográficas',
  'entidades:gerenciar': 'Cadastrar e editar entidades',
  'usuarios:gerenciar': 'Cadastrar, bloquear e redefinir usuários',
  'papeis:gerenciar': 'Editar permissões dos perfis',
  'config:metodologia': 'Parâmetros metodológicos',
  'auditoria:ler': 'Consultar a trilha de auditoria',
} as const;

export type Permissao = keyof typeof PERMISSOES;
export const TODAS_PERMISSOES = Object.keys(PERMISSOES) as Permissao[];

export type CodigoPapel = 'administrador' | 'gestor' | 'analista' | 'entidade' | 'visualizador';

const ANALISE: Permissao[] = [
  'submissao:ler_todas',
  'analise:ler',
  'analise:comentar',
  'analise:devolver',
  'analise:aprovar',
  'analise:rejeitar',
  'analise:dados_restritos',
  'dados:ver_agregado',
  'dados:ver_nao_suprimido',
  'monitoramento:ler',
  'relatorio:gerar',
  'relatorio:exportar',
  'publicacao:ler',
];

export const PAPEIS_PADRAO: Record<
  CodigoPapel,
  { nome: string; descricao: string; mfaObrigatorio: boolean; permissoes: Permissao[] }
> = {
  administrador: {
    nome: 'Administrador',
    descricao: 'Acesso total, inclusive usuários e perfis.',
    mfaObrigatorio: true,
    permissoes: TODAS_PERMISSOES,
  },
  gestor: {
    nome: 'Gestor',
    descricao: 'Análise, publicação, cadastros, entidades e auditoria.',
    mfaObrigatorio: true,
    permissoes: [
      ...ANALISE,
      'analise:retirar',
      'publicacao:publicar',
      'publicacao:retirar',
      'cadastros:gerenciar',
      'geo:gerenciar',
      'entidades:gerenciar',
      'config:metodologia',
      'auditoria:ler',
    ],
  },
  analista: {
    nome: 'Analista',
    descricao: 'Revisa envios, comenta, aprova ou devolve; consulta dados e relatórios.',
    mfaObrigatorio: true,
    permissoes: ANALISE,
  },
  entidade: {
    nome: 'Entidade',
    descricao: 'Envia dados da própria entidade e acompanha a análise.',
    mfaObrigatorio: false,
    permissoes: ['submissao:criar', 'submissao:importar', 'submissao:ler_proprias'],
  },
  visualizador: {
    nome: 'Visualizador interno',
    descricao: 'Consulta dashboard, monitoramento e relatórios com supressão.',
    mfaObrigatorio: false,
    permissoes: ['dados:ver_agregado', 'monitoramento:ler', 'relatorio:gerar', 'publicacao:ler'],
  },
};
