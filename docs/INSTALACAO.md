# Instalação e operação

## Requisitos

- Node.js ≥ 20 (testado com 22) e pnpm 10; PostgreSQL 16 (Docker Compose incluso).
- HTTPS no ambiente de produção (cookies `Secure`, HSTS). O proxy reverso (Nginx/Caddy/Traefik) deve repassar `X-Forwarded-For`.

## 1. Desenvolvimento local

```bash
cp .env.example .env            # preencha OMV_CHAVE_CIFRA e OMV_SEGREDO_APP: openssl rand -base64 32
docker compose up -d db         # ou: pg_ctlcluster 16 main start
pnpm install
pnpm db:migrate                 # aplica db/migrations
pnpm db:seed:dev                # perfis, permissões, classificações, usuários de TESTE (senhas aleatórias impressas)
OMV_MODO_DEMO=true pnpm dev     # http://localhost:3000 — dados FICTÍCIOS sinalizados na tela
```

Os usuários de desenvolvimento (`admin@omv.test`, `gestor@…`, `analista@…`, `visualizador@…`, `entidade-a@…`, `entidade-b@…`) são criados **apenas** com `--dev`, que é recusado quando `NODE_ENV=production`.

## 2. Produção

### Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | Conexão PostgreSQL (usuário com permissão de DDL só para migrar; use outro usuário, sem DDL, em execução, se possível). |
| `OMV_CHAVE_CIFRA` | 32 bytes em base64. Cifra segredos MFA e arquivos importados. **Perdê-la impede decifrar** esses dados; guarde em cofre. |
| `OMV_SEGREDO_APP` | Segredo de aplicação (HMAC). |
| `OMV_URL_PUBLICA` | URL pública com `https://` (links de e-mail, cookies `Secure`). |
| `OMV_MODO_DEMO` | **Deixe `false`/ausente em produção.** |
| `SMTP_URL`, `SMTP_REMETENTE` | E-mail transacional (redefinição de senha). Provedor a definir pela Prefeitura. |
| `OMV_SESSAO_OCIOSA_MIN`, `OMV_SESSAO_ABSOLUTA_H` | Expiração de sessão (padrão 30 min / 12 h). |
| `OMV_ADMIN_EMAIL` | Usado **uma vez** por `pnpm db:seed` para criar o administrador inicial (senha temporária impressa uma vez; troca obrigatória). |

### Primeira implantação

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm db:migrate
OMV_ADMIN_EMAIL=admin@prefeitura.exemplo pnpm db:seed   # perfis, permissões, parâmetros PROVISÓRIOS, classificações
pnpm start                                              # porta 3000
```

Ou com Docker: `docker compose --profile app up -d` (a imagem executa as migrações ao iniciar).

No primeiro acesso, o administrador troca a senha e configura o MFA. Em seguida: cadastrar **entidades** e **usuários** (`/admin`), revisar **cadastros** (bairros e regiões oficiais) e **configurações metodológicas**, e importar a **base geográfica** (`/admin/geo`).

### Contorno municipal oficial

O repositório traz um contorno **esquemático provisório**. Para carregar o oficial do IBGE (código 3555406): `pnpm geo:ibge` (precisa de acesso a `servicodados.ibge.gov.br`), revisar e fazer commit de `src/lib/geo/contorno-ubatuba.json`.

## 3. Migrações

Versionadas em `db/migrations` (Drizzle). Para alterar o esquema: edite `src/lib/db/schema.ts`, rode `pnpm db:generate`, revise o SQL e `pnpm db:migrate`. A trilha de auditoria é protegida por *triggers* (somente inserção).

## 4. Backups e restauração

```bash
OMV_BACKUP_SENHA='…' DATABASE_URL=… ./scripts/backup.sh /var/backups/omv   # pg_dump cifrado (AES-256) + SHA-256
openssl enc -d -aes-256-cbc -pbkdf2 -in ARQUIVO.dump.enc -pass env:OMV_BACKUP_SENHA | pg_restore -d "$DATABASE_URL" --clean --if-exists
```

Agende diariamente, guarde cópias fora do servidor e **teste a restauração periodicamente**. Guarde `OMV_CHAVE_CIFRA` separadamente do backup.

## 5. Retenção (LGPD)

`pnpm retencao` remove arquivos originais importados vencidos, rascunhos antigos, tokens e tentativas de login antigos e sessões velhas. Agende diariamente (ex.: `0 3 * * * cd /opt/omv && pnpm retencao`). Prazos em `/admin/configuracoes` (PROVISÓRIOS até validação).

## 6. Monitoramento e manutenção

- Saúde: `GET /` deve responder 200; monitore também o log do processo (erros 5xx) e o banco (`pg_isready`).
- Acompanhe tentativas de login falhas e acessos a conteúdo restrito em `/admin/auditoria`.
- Atualize dependências regularmente (`pnpm outdated`, `pnpm audit`) e rode `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e` antes de implantar.
- Rotação de `OMV_SEGREDO_APP`: invalida tokens auxiliares; rotação de `OMV_CHAVE_CIFRA` exige recifrar segredos MFA (procedimento a definir com a equipe de TI).

## 7. Testes

- `pnpm test`: Vitest (unidade e integração; usa o banco `omv_test_unit`).
- `pnpm test:e2e`: Playwright (usa o banco `omv_test`, recriado a cada execução; sobe `next dev` em modo demonstração na porta 3100).
