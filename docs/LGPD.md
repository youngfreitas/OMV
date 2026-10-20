# LGPD — privacidade por desenho

> Documento técnico. A **base legal**, os **prazos de retenção** e os **termos com as entidades parceiras** dependem de validação do jurídico e do encarregado (DPO) — ver `PENDENCIAS-INSTITUCIONAIS.md`.

## Princípio: nenhum dado pessoal da pessoa atendida

O OMV recebe apenas **contagens agregadas** por período, território (bairro), tipo de registro, categoria e faixa etária. O sistema **não possui** campos para nome, CPF, RG, endereço, telefone, e-mail, coordenadas ou anexos da pessoa atendida, em nenhuma tabela.

## Controles técnicos

| Risco | Controle |
| --- | --- |
| Dado pessoal enviado por engano (formulário ou arquivo) | Detecção automática (CPF com dígito verificador, RG, telefone, e-mail, CEP, logradouro, coordenadas, data de nascimento, nomes próprios em texto livre). O envio é marcado **restrito**: células detectadas são **redigidas** nas tabelas de trabalho, o original fica **cifrado** (AES-256-GCM) e só é visível a quem tem `analise:dados_restritos` (acesso auditado); não pode ser aprovado; **não aparece em notificações, auditoria ou relatórios**. |
| Reidentificação por valores pequenos | Supressão primária (valor < k) e **complementar** (impede recálculo por diferença entre linhas, colunas e períodos), generalização bairro → região e limite de dimensões combináveis. k e demais parâmetros são **PROVISÓRIOS**. |
| Acesso indevido | RBAC granular, escopo por entidade em todas as consultas, MFA (TOTP) obrigatório para administrador/gestor/analista, bloqueio progressivo de tentativas, sessões opacas com expiração e revogação, cabeçalhos de segurança (CSP, HSTS…). |
| Vazamento por arquivos | Verificação de extensão, MIME, assinatura, tamanho (5 MB), zip-bomb, macros, objetos incorporados, fórmulas e vínculos externos; arquivos originais ficam **cifrados** e **expiram** (retenção configurável). |
| Adulteração de trilha | Auditoria **somente de inserção** (triggers bloqueiam UPDATE/DELETE/TRUNCATE). |
| Dados internos expostos | O dashboard e relatórios aplicam a mesma supressão a quem não tem `dados:ver_nao_suprimido`; exportações sem supressão são marcadas “uso interno — não divulgar” e auditadas. |

## Dados pessoais de usuários (equipe e entidades)

Nome, e-mail, hash de senha (argon2id), segredo MFA cifrado, IP e *user-agent* de sessões e eventos de auditoria. Finalidade: autenticação, segurança e prestação de contas. Retenção: enquanto a conta existir; auditoria é permanente por desenho (pendência: prazo oficial).

## Direitos dos titulares

Como não há dados de pessoas atendidas, os pedidos tratam de dados de **usuários**: acesso e correção (administração), eliminação/desativação de conta (a trilha de auditoria preserva identificadores técnicos).

## Pendências para o encarregado

Base legal (provável: execução de políticas públicas, art. 7º III/art. 11 II "b" da LGPD — **a confirmar**); prazos de retenção; termo de responsabilidade das entidades; RIPD (relatório de impacto) e política de privacidade pública final.
