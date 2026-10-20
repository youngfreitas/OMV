import { sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

const agora = () => timestamp('criado_em', { withTimezone: true }).notNull().defaultNow();
const id = () => uuid('id').primaryKey().defaultRandom();

/* ───────────── 1. Identidade e administração ───────────── */

export const entidades = pgTable('entidades', {
  id: id(),
  nome: text('nome').notNull(),
  tipo: text('tipo').notNull().default('outra'),
  ativo: boolean('ativo').notNull().default(true),
  observacoes: text('observacoes'),
  criadoEm: agora(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
});

export const papeis = pgTable('papeis', {
  id: id(),
  codigo: text('codigo').notNull().unique(),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  mfaObrigatorio: boolean('mfa_obrigatorio').notNull().default(false),
});

export const permissoes = pgTable('permissoes', {
  codigo: text('codigo').primaryKey(),
  descricao: text('descricao').notNull(),
});

export const papelPermissoes = pgTable(
  'papel_permissoes',
  {
    papelId: uuid('papel_id')
      .notNull()
      .references(() => papeis.id, { onDelete: 'cascade' }),
    permissaoCodigo: text('permissao_codigo')
      .notNull()
      .references(() => permissoes.codigo, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.papelId, t.permissaoCodigo] })],
);

export const usuarios = pgTable(
  'usuarios',
  {
    id: id(),
    email: text('email').notNull(),
    nome: text('nome').notNull(),
    senhaHash: text('senha_hash').notNull(),
    entidadeId: uuid('entidade_id').references(() => entidades.id),
    ativo: boolean('ativo').notNull().default(true),
    bloqueadoAte: timestamp('bloqueado_ate', { withTimezone: true }),
    mfaSegredoCifrado: text('mfa_segredo_cifrado'),
    mfaAtivo: boolean('mfa_ativo').notNull().default(false),
    codigosRecuperacaoHash: text('codigos_recuperacao_hash').array(),
    trocarSenha: boolean('trocar_senha').notNull().default(false),
    ultimoAcesso: timestamp('ultimo_acesso', { withTimezone: true }),
    criadoEm: agora(),
  },
  (t) => [uniqueIndex('usuarios_email_uq').on(sql`lower(${t.email})`)],
);

export const usuarioPapeis = pgTable(
  'usuario_papeis',
  {
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    papelId: uuid('papel_id')
      .notNull()
      .references(() => papeis.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.papelId] })],
);

export const sessoes = pgTable(
  'sessoes',
  {
    id: id(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    criadoEm: agora(),
    ultimoUso: timestamp('ultimo_uso', { withTimezone: true }).notNull().defaultNow(),
    absolutaEm: timestamp('absoluta_em', { withTimezone: true }).notNull(),
    revogadaEm: timestamp('revogada_em', { withTimezone: true }),
    mfaVerificado: boolean('mfa_verificado').notNull().default(false),
    ip: text('ip'),
    userAgent: text('user_agent'),
  },
  (t) => [index('sessoes_usuario_idx').on(t.usuarioId)],
);

export const tentativasLogin = pgTable(
  'tentativas_login',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    email: text('email').notNull(),
    ip: text('ip').notNull(),
    sucesso: boolean('sucesso').notNull(),
    criadoEm: agora(),
  },
  (t) => [index('tentativas_email_idx').on(t.email, t.criadoEm), index('tentativas_ip_idx').on(t.ip, t.criadoEm)],
);

export const tokensRedefinicao = pgTable('tokens_redefinicao', {
  id: id(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
  usadoEm: timestamp('usado_em', { withTimezone: true }),
  criadoEm: agora(),
});

/* ───────────── 2. Cadastros ───────────── */

export const regioes = pgTable('regioes', {
  id: id(),
  codigo: text('codigo').notNull().unique(),
  nome: text('nome').notNull(),
  ativo: boolean('ativo').notNull().default(true),
  provisorio: boolean('provisorio').notNull().default(true),
});

export const basesGeograficas = pgTable('bases_geograficas', {
  id: id(),
  tipo: text('tipo').notNull(), // 'municipio' | 'bairros'
  versao: text('versao').notNull(),
  fonte: text('fonte').notNull(),
  oficial: boolean('oficial').notNull().default(false),
  hash: text('hash').notNull(),
  geojson: jsonb('geojson').notNull(),
  ativa: boolean('ativa').notNull().default(false),
  criadoPor: uuid('criado_por').references(() => usuarios.id),
  criadoEm: agora(),
});

export const bairros = pgTable('bairros', {
  id: id(),
  codigo: text('codigo').notNull().unique(),
  nome: text('nome').notNull(),
  regiaoId: uuid('regiao_id').references(() => regioes.id),
  geoFeatureId: text('geo_feature_id'),
  ativo: boolean('ativo').notNull().default(true),
  provisorio: boolean('provisorio').notNull().default(true),
});

export const classificacoes = pgTable(
  'classificacoes',
  {
    id: id(),
    dominio: text('dominio').notNull(),
    codigo: text('codigo').notNull(),
    rotulo: text('rotulo').notNull(),
    definicao: text('definicao'),
    ordem: integer('ordem').notNull().default(0),
    ativo: boolean('ativo').notNull().default(true),
    provisorio: boolean('provisorio').notNull().default(true),
    metadados: jsonb('metadados'),
  },
  (t) => [uniqueIndex('classificacoes_uq').on(t.dominio, t.codigo)],
);

export const tags = pgTable('tags', {
  id: id(),
  nome: text('nome').notNull().unique(),
  ativo: boolean('ativo').notNull().default(true),
});

export const modelosImportacao = pgTable('modelos_importacao', {
  id: id(),
  formato: text('formato').notNull(),
  versao: text('versao').notNull(),
  idModelo: text('id_modelo').notNull(),
  hash: text('hash').notNull(),
  geradoEm: agora(),
});

/* ───────────── 3. Recebidos ───────────── */

export const submissoes = pgTable(
  'submissoes',
  {
    id: id(),
    protocolo: text('protocolo').unique(),
    entidadeId: uuid('entidade_id')
      .notNull()
      .references(() => entidades.id),
    criadoPor: uuid('criado_por')
      .notNull()
      .references(() => usuarios.id),
    enviadoPor: uuid('enviado_por').references(() => usuarios.id),
    status: text('status').notNull().default('rascunho'),
    periodoInicio: date('periodo_inicio', { mode: 'string' }),
    periodoFim: date('periodo_fim', { mode: 'string' }),
    tipoEntrada: text('tipo_entrada').notNull().default('formulario'),
    versaoModelo: text('versao_modelo').notNull(),
    unidadeAnalise: text('unidade_analise'),
    consolidacao: text('consolidacao'),
    chaveIdempotencia: text('chave_idempotencia').unique(),
    restrita: boolean('restrita').notNull().default(false),
    observacaoGeral: text('observacao_geral'),
    versaoAtual: integer('versao_atual').notNull().default(1),
    hashConteudo: text('hash_conteudo'),
    enviadoEm: timestamp('enviado_em', { withTimezone: true }),
    decididoEm: timestamp('decidido_em', { withTimezone: true }),
    criadoEm: agora(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('submissoes_entidade_idx').on(t.entidadeId), index('submissoes_status_idx').on(t.status)],
);

export const submissaoVersoes = pgTable(
  'submissao_versoes',
  {
    id: id(),
    submissaoId: uuid('submissao_id')
      .notNull()
      .references(() => submissoes.id, { onDelete: 'cascade' }),
    numero: integer('numero').notNull(),
    payload: jsonb('payload').notNull(),
    relatorioValidacao: jsonb('relatorio_validacao'),
    criadoPor: uuid('criado_por').references(() => usuarios.id),
    criadoEm: agora(),
  },
  (t) => [uniqueIndex('submissao_versoes_uq').on(t.submissaoId, t.numero)],
);

export const registrosRecebidos = pgTable(
  'registros_recebidos',
  {
    id: id(),
    submissaoId: uuid('submissao_id')
      .notNull()
      .references(() => submissoes.id, { onDelete: 'cascade' }),
    versaoNumero: integer('versao_numero').notNull(),
    linha: integer('linha').notNull(),
    dados: jsonb('dados').notNull(),
    hashLinha: text('hash_linha').notNull(),
    statusValidacao: text('status_validacao').notNull().default('ok'),
    alertas: jsonb('alertas'),
  },
  (t) => [index('registros_recebidos_sub_idx').on(t.submissaoId, t.versaoNumero), index('registros_recebidos_hash_idx').on(t.hashLinha)],
);

export const arquivosRecebidos = pgTable('arquivos_recebidos', {
  id: id(),
  submissaoId: uuid('submissao_id')
    .notNull()
    .references(() => submissoes.id, { onDelete: 'cascade' }),
  nomeOriginal: text('nome_original').notNull(),
  mime: text('mime').notNull(),
  tamanho: integer('tamanho').notNull(),
  sha256: text('sha256').notNull(),
  conteudoCifrado: bytea('conteudo_cifrado'),
  expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
  criadoEm: agora(),
});

export const pendencias = pgTable('pendencias', {
  id: id(),
  submissaoId: uuid('submissao_id')
    .notNull()
    .references(() => submissoes.id, { onDelete: 'cascade' }),
  linha: integer('linha'),
  campo: text('campo'),
  descricao: text('descricao').notNull(),
  status: text('status').notNull().default('aberta'),
  criadoPor: uuid('criado_por').references(() => usuarios.id),
  criadoEm: agora(),
  resolvidaEm: timestamp('resolvida_em', { withTimezone: true }),
});

export const comentariosTecnicos = pgTable('comentarios_tecnicos', {
  id: id(),
  submissaoId: uuid('submissao_id')
    .notNull()
    .references(() => submissoes.id, { onDelete: 'cascade' }),
  autorId: uuid('autor_id')
    .notNull()
    .references(() => usuarios.id),
  texto: text('texto').notNull(),
  visivelEntidade: boolean('visivel_entidade').notNull().default(true),
  criadoEm: agora(),
});

export const decisoesAnalise = pgTable('decisoes_analise', {
  id: id(),
  submissaoId: uuid('submissao_id')
    .notNull()
    .references(() => submissoes.id, { onDelete: 'cascade' }),
  acao: text('acao').notNull(),
  deStatus: text('de_status').notNull(),
  paraStatus: text('para_status').notNull(),
  justificativa: text('justificativa'),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuarios.id),
  criadoEm: agora(),
});

/* ───────────── 4. Analítica aprovada ───────────── */

export const registrosAprovados = pgTable(
  'registros_aprovados',
  {
    id: id(),
    submissaoId: uuid('submissao_id')
      .notNull()
      .references(() => submissoes.id),
    entidadeId: uuid('entidade_id')
      .notNull()
      .references(() => entidades.id),
    linha: integer('linha').notNull(),
    periodo: text('periodo').notNull(), // YYYY-MM
    periodoInicio: date('periodo_inicio', { mode: 'string' }).notNull(),
    periodoFim: date('periodo_fim', { mode: 'string' }).notNull(),
    bairroId: uuid('bairro_id').references(() => bairros.id),
    regiaoId: uuid('regiao_id').references(() => regioes.id),
    tipoRegistro: text('tipo_registro').notNull(),
    unidadeContagem: text('unidade_contagem').notNull(),
    categoriaViolencia: text('categoria_violencia').notNull(),
    faixaEtaria: text('faixa_etaria').notNull(),
    tipoAtendimento: text('tipo_atendimento'),
    canalEntrada: text('canal_entrada'),
    relacaoAutor: text('relacao_autor'),
    situacaoAtendimento: text('situacao_atendimento'),
    quantidade: integer('quantidade').notNull(),
    ativo: boolean('ativo').notNull().default(true),
    retiradoEm: timestamp('retirado_em', { withTimezone: true }),
    aprovadoEm: timestamp('aprovado_em', { withTimezone: true }).notNull().defaultNow(),
    aprovadoPor: uuid('aprovado_por').references(() => usuarios.id),
  },
  (t) => [index('reg_aprov_periodo_idx').on(t.periodo, t.ativo), index('reg_aprov_sub_idx').on(t.submissaoId)],
);

export const registroTags = pgTable(
  'registro_tags',
  {
    registroId: uuid('registro_id')
      .notNull()
      .references(() => registrosAprovados.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.registroId, t.tagId] })],
);

export const registroHistorico = pgTable('registro_historico', {
  id: id(),
  registroId: uuid('registro_id')
    .notNull()
    .references(() => registrosAprovados.id, { onDelete: 'cascade' }),
  acao: text('acao').notNull(),
  dados: jsonb('dados'),
  usuarioId: uuid('usuario_id').references(() => usuarios.id),
  criadoEm: agora(),
});

/* ───────────── 5. Pública ───────────── */

export const publicacoes = pgTable('publicacoes', {
  id: id(),
  versao: integer('versao').notNull().unique(),
  status: text('status').notNull().default('rascunho'), // rascunho | publicada | retirada | substituida
  parametros: jsonb('parametros').notNull(),
  relatorioSupressao: jsonb('relatorio_supressao'),
  baseGeograficaId: uuid('base_geografica_id').references(() => basesGeograficas.id),
  geradaPor: uuid('gerada_por').references(() => usuarios.id),
  geradaEm: timestamp('gerada_em', { withTimezone: true }).notNull().defaultNow(),
  publicadaPor: uuid('publicada_por').references(() => usuarios.id),
  publicadaEm: timestamp('publicada_em', { withTimezone: true }),
});

export const indicadoresPublicados = pgTable(
  'indicadores_publicados',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    publicacaoId: uuid('publicacao_id')
      .notNull()
      .references(() => publicacoes.id, { onDelete: 'cascade' }),
    cubo: text('cubo').notNull(), // total | territorio | categoria | faixa | tipo
    periodo: text('periodo').notNull(), // YYYY-MM | YYYY | todos
    unidade: text('unidade').notNull(),
    territorioTipo: text('territorio_tipo').notNull(), // municipio | regiao | bairro
    territorioId: text('territorio_id').notNull(),
    dimensao: text('dimensao').notNull().default(''),
    valor: integer('valor'),
    suprimido: boolean('suprimido').notNull().default(false),
    motivo: text('motivo'),
  },
  (t) => [index('ind_pub_idx').on(t.publicacaoId, t.cubo, t.unidade, t.periodo)],
);

/* ───────────── 6. Transversal ───────────── */

export const configuracoesMetodologicas = pgTable('configuracoes_metodologicas', {
  chave: text('chave').primaryKey(),
  valor: jsonb('valor').notNull(),
  provisorio: boolean('provisorio').notNull().default(true),
  descricao: text('descricao'),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  atualizadoPor: uuid('atualizado_por').references(() => usuarios.id),
});

export const auditoria = pgTable(
  'auditoria',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    ocorridoEm: timestamp('ocorrido_em', { withTimezone: true }).notNull().defaultNow(),
    usuarioId: uuid('usuario_id'),
    entidadeId: uuid('entidade_id'),
    acao: text('acao').notNull(),
    recursoTipo: text('recurso_tipo'),
    recursoId: text('recurso_id'),
    ip: text('ip'),
    detalhes: jsonb('detalhes'),
  },
  (t) => [index('auditoria_quando_idx').on(t.ocorridoEm), index('auditoria_acao_idx').on(t.acao)],
);

export const notificacoes = pgTable(
  'notificacoes',
  {
    id: id(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    titulo: text('titulo').notNull(),
    texto: text('texto'),
    link: text('link'),
    lidaEm: timestamp('lida_em', { withTimezone: true }),
    criadoEm: agora(),
  },
  (t) => [index('notif_usuario_idx').on(t.usuarioId, t.lidaEm)],
);

export const visualizacoesSalvas = pgTable('visualizacoes_salvas', {
  id: id(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  filtros: jsonb('filtros').notNull(),
  criadoEm: agora(),
});

export const relatoriosGerados = pgTable('relatorios_gerados', {
  id: id(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuarios.id),
  tipo: text('tipo').notNull(),
  formato: text('formato').notNull(),
  parametros: jsonb('parametros'),
  tamanho: integer('tamanho'),
  sha256: text('sha256'),
  criadoEm: agora(),
});
