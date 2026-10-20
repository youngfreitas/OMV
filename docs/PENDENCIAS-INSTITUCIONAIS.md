# Pendências que dependem da instituição

Itens marcados **PROVISÓRIO** no sistema aguardam validação. Nada abaixo foi inventado: onde falta informação oficial, as telas
mostram “a confirmar”.

| # | Pendência | Responsável sugerido | Onde aparece no sistema |
| --- | --- | --- | --- |
| 1 | Limites oficiais de bairros e regiões (GeoJSON) | Planejamento / Secretaria | `/admin/geo`, mapa |
| 2 | Lista oficial de bairros e regiões | Secretaria | `/admin/cadastros` |
| 3 | Limiar de supressão (k) e combinações permitidas de filtros | Secretaria + encarregado LGPD | `/admin/configuracoes` (PROVISÓRIO: k = 5) |
| 4 | Definições oficiais das categorias de violência e demais classificações | Secretaria | `/admin/cadastros` (PROVISÓRIO) |
| 5 | Base legal, prazos de retenção e termos com as entidades parceiras | Jurídico / encarregado LGPD | `docs/LGPD.md`, página de privacidade |
| 6 | Textos e contatos oficiais da Secretaria (competências, endereço, telefone) | Secretaria | landing (“a confirmar”) |
| 7 | Logos/brasão da Prefeitura | Comunicação | rodapé / landing |
| 8 | Método de deduplicação e de reincidência | Secretaria + analistas | `docs/METODOLOGIA.md` |
| 9 | Política de segregação de funções (aprovador ≠ remetente) | Secretaria | `/admin/configuracoes` |
| 10 | Provedor de e-mail (SMTP) para redefinição de senha e avisos | TI | `.env` (`SMTP_URL`) |
| 11 | Contorno municipal oficial do IBGE | TI | `pnpm geo:ibge` (o repositório traz contorno esquemático provisório) |
