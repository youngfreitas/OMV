# Perfis e permissões

Visitante = sem sessão (acessa somente `/`, `/mapa`, `/entrar`, `/recuperar-senha` e `/api/publico/*`).

## Catálogo de permissões

| Código | Descrição |
| --- | --- |
| `submissao:criar` | Criar rascunhos e enviar formulários da própria entidade |
| `submissao:importar` | Importar arquivos (CSV/XLSX/DOCX/MD) da própria entidade |
| `submissao:ler_proprias` | Ver os envios da própria entidade |
| `submissao:ler_todas` | Ver envios de todas as entidades |
| `analise:ler` | Abrir a fila e a tela de análise |
| `analise:comentar` | Registrar comentários técnicos e pendências |
| `analise:devolver` | Devolver para correção |
| `analise:aprovar` | Aprovar envios |
| `analise:rejeitar` | Rejeitar envios (justificativa obrigatória) |
| `analise:retirar` | Retirar envio aprovado da base analítica/publicação |
| `analise:dados_restritos` | Ver conteúdo de envios marcados como restritos (possível dado pessoal) |
| `dados:ver_agregado` | Dashboard interno com regras de supressão |
| `dados:ver_nao_suprimido` | Ver valores sem supressão no ambiente interno |
| `monitoramento:ler` | Tabela de monitoramento |
| `relatorio:gerar` | Gerar relatórios |
| `relatorio:exportar` | Exportar PDF/XLSX |
| `publicacao:ler` | Ver publicações |
| `publicacao:publicar` | Gerar/aprovar publicação |
| `publicacao:retirar` | Retirar publicação |
| `cadastros:gerenciar` | Classificações, tags, bairros, regiões |
| `geo:gerenciar` | Importar bases geográficas |
| `entidades:gerenciar` | Cadastrar e editar entidades |
| `usuarios:gerenciar` | Cadastrar, bloquear e redefinir usuários |
| `papeis:gerenciar` | Editar permissões dos perfis |
| `config:metodologia` | Parâmetros metodológicos (supressão, retenção…) |
| `auditoria:ler` | Consultar a trilha de auditoria |

## Perfis (matriz padrão)

| Permissão | Administrador | Gestor | Analista | Entidade | Visualizador interno |
| --- | :-: | :-: | :-: | :-: | :-: |
| `submissao:criar` / `importar` / `ler_proprias` | | | | ✔ | |
| `submissao:ler_todas` | ✔ | ✔ | ✔ | | |
| `analise:ler` / `comentar` / `devolver` / `rejeitar` | ✔ | ✔ | ✔ | | |
| `analise:aprovar` | ✔ | ✔ | ✔ | | |
| `analise:retirar` | ✔ | ✔ | | | |
| `analise:dados_restritos` | ✔ | ✔ | ✔ | | |
| `dados:ver_agregado` | ✔ | ✔ | ✔ | | ✔ |
| `dados:ver_nao_suprimido` | ✔ | ✔ | ✔ | | |
| `monitoramento:ler` | ✔ | ✔ | ✔ | | ✔ |
| `relatorio:gerar` | ✔ | ✔ | ✔ | | ✔ |
| `relatorio:exportar` | ✔ | ✔ | ✔ | | |
| `publicacao:ler` | ✔ | ✔ | ✔ | | ✔ |
| `publicacao:publicar` / `retirar` | ✔ | ✔ | | | |
| `cadastros:gerenciar` / `geo:gerenciar` | ✔ | ✔ | | | |
| `entidades:gerenciar` | ✔ | ✔ | | | |
| `usuarios:gerenciar` / `papeis:gerenciar` | ✔ | | | | |
| `config:metodologia` | ✔ | ✔ | | | |
| `auditoria:ler` | ✔ | ✔ | | | |

- **MFA (TOTP)** é obrigatório para administrador, gestor e analista.
- **Segregação**: quem enviou não aprova o próprio envio (configurável em `configuracoes_metodologicas`).
- **Escopo de entidade**: usuário de entidade só enxerga e altera registros com seu `entidade_id`, em qualquer rota.
- As permissões são granulares e editáveis por `papeis:gerenciar`; os perfis acima são a configuração inicial (seed).
