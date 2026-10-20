CREATE TABLE "arquivos_recebidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submissao_id" uuid NOT NULL,
	"nome_original" text NOT NULL,
	"mime" text NOT NULL,
	"tamanho" integer NOT NULL,
	"sha256" text NOT NULL,
	"conteudo_cifrado" "bytea",
	"expira_em" timestamp with time zone NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ocorrido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"usuario_id" uuid,
	"entidade_id" uuid,
	"acao" text NOT NULL,
	"recurso_tipo" text,
	"recurso_id" text,
	"ip" text,
	"detalhes" jsonb
);
--> statement-breakpoint
CREATE TABLE "bairros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"regiao_id" uuid,
	"geo_feature_id" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"provisorio" boolean DEFAULT true NOT NULL,
	CONSTRAINT "bairros_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "bases_geograficas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"versao" text NOT NULL,
	"fonte" text NOT NULL,
	"oficial" boolean DEFAULT false NOT NULL,
	"hash" text NOT NULL,
	"geojson" jsonb NOT NULL,
	"ativa" boolean DEFAULT false NOT NULL,
	"criado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classificacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dominio" text NOT NULL,
	"codigo" text NOT NULL,
	"rotulo" text NOT NULL,
	"definicao" text,
	"ordem" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"provisorio" boolean DEFAULT true NOT NULL,
	"metadados" jsonb
);
--> statement-breakpoint
CREATE TABLE "comentarios_tecnicos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submissao_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"visivel_entidade" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "configuracoes_metodologicas" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" jsonb NOT NULL,
	"provisorio" boolean DEFAULT true NOT NULL,
	"descricao" text,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "decisoes_analise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submissao_id" uuid NOT NULL,
	"acao" text NOT NULL,
	"de_status" text NOT NULL,
	"para_status" text NOT NULL,
	"justificativa" text,
	"usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entidades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"tipo" text DEFAULT 'outra' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"observacoes" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indicadores_publicados" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicacao_id" uuid NOT NULL,
	"cubo" text NOT NULL,
	"periodo" text NOT NULL,
	"unidade" text NOT NULL,
	"territorio_tipo" text NOT NULL,
	"territorio_id" text NOT NULL,
	"dimensao" text DEFAULT '' NOT NULL,
	"valor" integer,
	"suprimido" boolean DEFAULT false NOT NULL,
	"motivo" text
);
--> statement-breakpoint
CREATE TABLE "modelos_importacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formato" text NOT NULL,
	"versao" text NOT NULL,
	"id_modelo" text NOT NULL,
	"hash" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"texto" text,
	"link" text,
	"lida_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "papeis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"mfa_obrigatorio" boolean DEFAULT false NOT NULL,
	CONSTRAINT "papeis_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "papel_permissoes" (
	"papel_id" uuid NOT NULL,
	"permissao_codigo" text NOT NULL,
	CONSTRAINT "papel_permissoes_papel_id_permissao_codigo_pk" PRIMARY KEY("papel_id","permissao_codigo")
);
--> statement-breakpoint
CREATE TABLE "pendencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submissao_id" uuid NOT NULL,
	"linha" integer,
	"campo" text,
	"descricao" text NOT NULL,
	"status" text DEFAULT 'aberta' NOT NULL,
	"criado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"resolvida_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "permissoes" (
	"codigo" text PRIMARY KEY NOT NULL,
	"descricao" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publicacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"versao" integer NOT NULL,
	"status" text DEFAULT 'rascunho' NOT NULL,
	"parametros" jsonb NOT NULL,
	"relatorio_supressao" jsonb,
	"base_geografica_id" uuid,
	"gerada_por" uuid,
	"gerada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"publicada_por" uuid,
	"publicada_em" timestamp with time zone,
	CONSTRAINT "publicacoes_versao_unique" UNIQUE("versao")
);
--> statement-breakpoint
CREATE TABLE "regioes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"provisorio" boolean DEFAULT true NOT NULL,
	CONSTRAINT "regioes_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "registro_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registro_id" uuid NOT NULL,
	"acao" text NOT NULL,
	"dados" jsonb,
	"usuario_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registro_tags" (
	"registro_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "registro_tags_registro_id_tag_id_pk" PRIMARY KEY("registro_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "registros_aprovados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submissao_id" uuid NOT NULL,
	"entidade_id" uuid NOT NULL,
	"linha" integer NOT NULL,
	"periodo" text NOT NULL,
	"periodo_inicio" date NOT NULL,
	"periodo_fim" date NOT NULL,
	"bairro_id" uuid,
	"regiao_id" uuid,
	"tipo_registro" text NOT NULL,
	"unidade_contagem" text NOT NULL,
	"categoria_violencia" text NOT NULL,
	"faixa_etaria" text NOT NULL,
	"tipo_atendimento" text,
	"canal_entrada" text,
	"relacao_autor" text,
	"situacao_atendimento" text,
	"quantidade" integer NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"retirado_em" timestamp with time zone,
	"aprovado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"aprovado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "registros_recebidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submissao_id" uuid NOT NULL,
	"versao_numero" integer NOT NULL,
	"linha" integer NOT NULL,
	"dados" jsonb NOT NULL,
	"hash_linha" text NOT NULL,
	"status_validacao" text DEFAULT 'ok' NOT NULL,
	"alertas" jsonb
);
--> statement-breakpoint
CREATE TABLE "relatorios_gerados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"formato" text NOT NULL,
	"parametros" jsonb,
	"tamanho" integer,
	"sha256" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ultimo_uso" timestamp with time zone DEFAULT now() NOT NULL,
	"absoluta_em" timestamp with time zone NOT NULL,
	"revogada_em" timestamp with time zone,
	"mfa_verificado" boolean DEFAULT false NOT NULL,
	"ip" text,
	"user_agent" text,
	CONSTRAINT "sessoes_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "submissao_versoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submissao_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"relatorio_validacao" jsonb,
	"criado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocolo" text,
	"entidade_id" uuid NOT NULL,
	"criado_por" uuid NOT NULL,
	"enviado_por" uuid,
	"status" text DEFAULT 'rascunho' NOT NULL,
	"periodo_inicio" date,
	"periodo_fim" date,
	"tipo_entrada" text DEFAULT 'formulario' NOT NULL,
	"versao_modelo" text NOT NULL,
	"unidade_analise" text,
	"consolidacao" text,
	"chave_idempotencia" text,
	"restrita" boolean DEFAULT false NOT NULL,
	"observacao_geral" text,
	"versao_atual" integer DEFAULT 1 NOT NULL,
	"hash_conteudo" text,
	"enviado_em" timestamp with time zone,
	"decidido_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submissoes_protocolo_unique" UNIQUE("protocolo"),
	CONSTRAINT "submissoes_chave_idempotencia_unique" UNIQUE("chave_idempotencia")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "tags_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE "tentativas_login" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"ip" text NOT NULL,
	"sucesso" boolean NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens_redefinicao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tokens_redefinicao_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "usuario_papeis" (
	"usuario_id" uuid NOT NULL,
	"papel_id" uuid NOT NULL,
	CONSTRAINT "usuario_papeis_usuario_id_papel_id_pk" PRIMARY KEY("usuario_id","papel_id")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nome" text NOT NULL,
	"senha_hash" text NOT NULL,
	"entidade_id" uuid,
	"ativo" boolean DEFAULT true NOT NULL,
	"bloqueado_ate" timestamp with time zone,
	"mfa_segredo_cifrado" text,
	"mfa_ativo" boolean DEFAULT false NOT NULL,
	"codigos_recuperacao_hash" text[],
	"trocar_senha" boolean DEFAULT false NOT NULL,
	"ultimo_acesso" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visualizacoes_salvas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"filtros" jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "arquivos_recebidos" ADD CONSTRAINT "arquivos_recebidos_submissao_id_submissoes_id_fk" FOREIGN KEY ("submissao_id") REFERENCES "public"."submissoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bairros" ADD CONSTRAINT "bairros_regiao_id_regioes_id_fk" FOREIGN KEY ("regiao_id") REFERENCES "public"."regioes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bases_geograficas" ADD CONSTRAINT "bases_geograficas_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentarios_tecnicos" ADD CONSTRAINT "comentarios_tecnicos_submissao_id_submissoes_id_fk" FOREIGN KEY ("submissao_id") REFERENCES "public"."submissoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentarios_tecnicos" ADD CONSTRAINT "comentarios_tecnicos_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuracoes_metodologicas" ADD CONSTRAINT "configuracoes_metodologicas_atualizado_por_usuarios_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisoes_analise" ADD CONSTRAINT "decisoes_analise_submissao_id_submissoes_id_fk" FOREIGN KEY ("submissao_id") REFERENCES "public"."submissoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisoes_analise" ADD CONSTRAINT "decisoes_analise_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicadores_publicados" ADD CONSTRAINT "indicadores_publicados_publicacao_id_publicacoes_id_fk" FOREIGN KEY ("publicacao_id") REFERENCES "public"."publicacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "papel_permissoes" ADD CONSTRAINT "papel_permissoes_papel_id_papeis_id_fk" FOREIGN KEY ("papel_id") REFERENCES "public"."papeis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "papel_permissoes" ADD CONSTRAINT "papel_permissoes_permissao_codigo_permissoes_codigo_fk" FOREIGN KEY ("permissao_codigo") REFERENCES "public"."permissoes"("codigo") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pendencias" ADD CONSTRAINT "pendencias_submissao_id_submissoes_id_fk" FOREIGN KEY ("submissao_id") REFERENCES "public"."submissoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pendencias" ADD CONSTRAINT "pendencias_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_base_geografica_id_bases_geograficas_id_fk" FOREIGN KEY ("base_geografica_id") REFERENCES "public"."bases_geograficas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_gerada_por_usuarios_id_fk" FOREIGN KEY ("gerada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_publicada_por_usuarios_id_fk" FOREIGN KEY ("publicada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_historico" ADD CONSTRAINT "registro_historico_registro_id_registros_aprovados_id_fk" FOREIGN KEY ("registro_id") REFERENCES "public"."registros_aprovados"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_historico" ADD CONSTRAINT "registro_historico_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_tags" ADD CONSTRAINT "registro_tags_registro_id_registros_aprovados_id_fk" FOREIGN KEY ("registro_id") REFERENCES "public"."registros_aprovados"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_tags" ADD CONSTRAINT "registro_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_aprovados" ADD CONSTRAINT "registros_aprovados_submissao_id_submissoes_id_fk" FOREIGN KEY ("submissao_id") REFERENCES "public"."submissoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_aprovados" ADD CONSTRAINT "registros_aprovados_entidade_id_entidades_id_fk" FOREIGN KEY ("entidade_id") REFERENCES "public"."entidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_aprovados" ADD CONSTRAINT "registros_aprovados_bairro_id_bairros_id_fk" FOREIGN KEY ("bairro_id") REFERENCES "public"."bairros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_aprovados" ADD CONSTRAINT "registros_aprovados_regiao_id_regioes_id_fk" FOREIGN KEY ("regiao_id") REFERENCES "public"."regioes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_aprovados" ADD CONSTRAINT "registros_aprovados_aprovado_por_usuarios_id_fk" FOREIGN KEY ("aprovado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_recebidos" ADD CONSTRAINT "registros_recebidos_submissao_id_submissoes_id_fk" FOREIGN KEY ("submissao_id") REFERENCES "public"."submissoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relatorios_gerados" ADD CONSTRAINT "relatorios_gerados_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissao_versoes" ADD CONSTRAINT "submissao_versoes_submissao_id_submissoes_id_fk" FOREIGN KEY ("submissao_id") REFERENCES "public"."submissoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissao_versoes" ADD CONSTRAINT "submissao_versoes_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissoes" ADD CONSTRAINT "submissoes_entidade_id_entidades_id_fk" FOREIGN KEY ("entidade_id") REFERENCES "public"."entidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissoes" ADD CONSTRAINT "submissoes_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissoes" ADD CONSTRAINT "submissoes_enviado_por_usuarios_id_fk" FOREIGN KEY ("enviado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens_redefinicao" ADD CONSTRAINT "tokens_redefinicao_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_papeis" ADD CONSTRAINT "usuario_papeis_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_papeis" ADD CONSTRAINT "usuario_papeis_papel_id_papeis_id_fk" FOREIGN KEY ("papel_id") REFERENCES "public"."papeis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_entidade_id_entidades_id_fk" FOREIGN KEY ("entidade_id") REFERENCES "public"."entidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visualizacoes_salvas" ADD CONSTRAINT "visualizacoes_salvas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auditoria_quando_idx" ON "auditoria" USING btree ("ocorrido_em");--> statement-breakpoint
CREATE INDEX "auditoria_acao_idx" ON "auditoria" USING btree ("acao");--> statement-breakpoint
CREATE UNIQUE INDEX "classificacoes_uq" ON "classificacoes" USING btree ("dominio","codigo");--> statement-breakpoint
CREATE INDEX "ind_pub_idx" ON "indicadores_publicados" USING btree ("publicacao_id","cubo","unidade","periodo");--> statement-breakpoint
CREATE INDEX "notif_usuario_idx" ON "notificacoes" USING btree ("usuario_id","lida_em");--> statement-breakpoint
CREATE INDEX "reg_aprov_periodo_idx" ON "registros_aprovados" USING btree ("periodo","ativo");--> statement-breakpoint
CREATE INDEX "reg_aprov_sub_idx" ON "registros_aprovados" USING btree ("submissao_id");--> statement-breakpoint
CREATE INDEX "registros_recebidos_sub_idx" ON "registros_recebidos" USING btree ("submissao_id","versao_numero");--> statement-breakpoint
CREATE INDEX "registros_recebidos_hash_idx" ON "registros_recebidos" USING btree ("hash_linha");--> statement-breakpoint
CREATE INDEX "sessoes_usuario_idx" ON "sessoes" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submissao_versoes_uq" ON "submissao_versoes" USING btree ("submissao_id","numero");--> statement-breakpoint
CREATE INDEX "submissoes_entidade_idx" ON "submissoes" USING btree ("entidade_id");--> statement-breakpoint
CREATE INDEX "submissoes_status_idx" ON "submissoes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tentativas_email_idx" ON "tentativas_login" USING btree ("email","criado_em");--> statement-breakpoint
CREATE INDEX "tentativas_ip_idx" ON "tentativas_login" USING btree ("ip","criado_em");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_uq" ON "usuarios" USING btree (lower("email"));