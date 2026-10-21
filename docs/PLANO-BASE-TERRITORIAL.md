# Plano — uso dos PDFs de regiões/bairros e do SVG do mapa da cidade

Materiais recebidos (pasta local `Downloads\OMV`, ainda **fora do repositório**):

- **PDFs**: divisão do município em regiões e nomes dos bairros de cada região.
- **SVG**: mapa da cidade.

Eles resolvem, total ou parcialmente, as pendências 1 e 2 de `PENDENCIAS-INSTITUCIONAIS.md` (limites e lista oficial de
bairros e regiões) e permitem trocar o que hoje é demonstrativo (regiões A/B/C, “Bairro demonstrativo 01…12”, células
hexagonais e contorno esquemático) por dados reais.

> Este plano foi escrito **sem acesso aos arquivos**. A Fase 0 confirma as premissas e pode alterar as Fases 2 e 3.

---

## Fase 0 — Trazer os arquivos e diagnosticar

1. Copiar os originais, sem edição, para `design/fontes/territorio/` (PDFs + SVG) e registrar em
   `design/fontes/territorio/FONTE.md`: órgão emissor, nome do documento, data e se é oficial.
   Essa fonte vai para o campo `fonte` de `bases_geograficas` e para os avisos do mapa.
2. Diagnosticar o SVG (decide a Fase 2):
   - Tem **um `<path>`/`<g>` por bairro** (ou por região) com `id`/rótulo? Ou é um desenho único / imagem embutida?
   - Está em **coordenadas de tela** (o caso comum) ou tem georreferência (raro)?
   - Inclui ilhas (Anchieta etc.), linha de costa, rodovias, rótulos de texto?
3. Diagnosticar os PDFs: texto selecionável ou digitalizado (exige OCR/digitação)? Há códigos oficiais de bairro?
   Bairros aparecem em mais de uma região? Grafias variantes (“Perequê-Açu” × “Perequê Açu”)?

**Pronto quando**: arquivos versionados, `FONTE.md` preenchido e as respostas acima registradas.

---

## Fase 1 — Cadastro real de regiões e bairros (a partir dos PDFs)

Hoje o cadastro (`regioes`, `bairros`) só é populado pelo seed de desenvolvimento.

1. Transcrever os PDFs para um arquivo de dados versionado, revisável em PR:
   `src/lib/territorio/ubatuba.json`

   ```json
   {
     "fonte": "…", "versao": "2026-10",
     "regioes": [
       { "codigo": "norte", "nome": "Região Norte",
         "bairros": [{ "codigo": "picinguaba", "nome": "Picinguaba", "sinonimos": ["Vila de Picinguaba"] }] }
     ]
   }
   ```

   - `codigo` = código oficial se o PDF trouxer; senão slug estável (nunca muda depois de publicado).
   - `sinonimos` alimenta a importação de planilhas e a ligação automática com o mapa.
2. Script idempotente `scripts/carregar-territorio.ts` (`pnpm db:territorio`): upsert por `codigo`, liga cada bairro à
   região, marca `provisorio = false` **só** se `FONTE.md` disser que é oficial; bairros que saíram da lista são
   **desativados** (não apagados, por causa de `registros_aprovados`). Grava auditoria.
3. Teste em `tests/` validando o JSON: códigos únicos, todo bairro com região, nenhum nome duplicado após `chaveTexto`.
4. Usar `sinonimos` na validação de bairro (`src/lib/validacao/regras.ts`) e na ligação do importador geográfico
   (`sugerirLigacao` em `src/lib/geo/importador.ts`, que hoje compara só o nome).
5. Formulário de envio (`FormularioEnvio.tsx`): select de bairro **agrupado por região** (`<optgroup>`) e com busca —
   com a lista real ele passa de 12 para dezenas de itens. Modelos CSV/XLSX/DOCX (`src/lib/modelos/`) passam a trazer
   a aba/lista de bairros por região.
6. `semearDev` continua com dados demonstrativos só quando o cadastro real não foi carregado.

**Pronto quando**: `/admin/cadastros` lista as regiões e bairros reais; formulário, modelos e importação os aceitam.

---

## Fase 2 — Geometria: do SVG para GeoJSON

O mapa público (`MapaInterativo.tsx`) e o importador (`/admin/geo`) trabalham com **GeoJSON em lon/lat**, projetado
pelo d3-geo e alinhado ao contorno do IBGE. Um SVG em pixels não encaixa direto. Caminhos, conforme a Fase 0:

| SVG tem… | Caminho |
| --- | --- |
| um polígono por bairro | **A** — converter para GeoJSON com georreferenciamento |
| só polígonos por região | **A** para regiões; bairros ficam sem geometria (mapa por região, tabela por bairro) |
| desenho único / imagem | **C** — usar só como ilustração (hero) e pedir o shapefile/GeoJSON ao Planejamento |

**Caminho A — `scripts/svg-para-geojson.ts`**

1. Ler os `<path>` (parser XML já é dependência: `fast-xml-parser`), achatar curvas em polilinhas e aplicar os
   `transform` dos grupos.
2. Georreferenciar com uma **transformação afim** calculada a partir de 3–6 pontos de controle (pixel → lon/lat),
   escolhidos em feições inconfundíveis do contorno do IBGE (pontas, fozes, divisa com Paraty e Caraguatatuba).
   Pontos guardados em `design/fontes/territorio/pontos-controle.json`; o script informa o erro médio em metros.
3. Recortar cada bairro pelo contorno municipal e simplificar (as coordenadas já são arredondadas pelo importador).
4. Gerar `bairros-ubatuba.geojson` com `properties: { id, nome }` e conferir a orientação dos anéis
   (`orientarParaD3`).
5. Carregar via `/admin/geo` (fluxo atual: envio → ligação feição↔bairro → ativação), com `oficial = false` e fonte
   “Digitalização do SVG X, georreferenciado manualmente (erro médio N m)”. Só vira oficial com a validação da pendência 1.
6. Se o SVG também tiver regiões, gerar `regioes-ubatuba.geojson`; se não, derivar regiões unindo os bairros
   (dissolve) no próprio script.

**Pré-requisito**: rodar `pnpm geo:ibge` para substituir o contorno esquemático pelo oficial (pendência 11). Sem isso o
georreferenciamento fica calibrado contra uma aproximação.

---

## Fase 3 — Mapa público (`/mapa`)

Com bairros e regiões reais:

1. **Camada de regiões**: contorno das regiões desenhado sobre os bairros (traço mais forte) e seletor
   “Ver por: Bairros | Regiões”. Em “Regiões”, o coroplético usa as células `regiao`, já calculadas pela publicação.
2. **Generalização visível**: bairro suprimido com região publicável aparece com a hachura e, ao lado, o valor da
   região (o painel lateral já mostra isso; falta o destaque da região no mapa).
3. **Busca de bairro** (campo com autocompletar) que seleciona e centraliza a área — essencial com dezenas de polígonos
   pequenos e ilhas.
4. **Rótulos** das regiões no mapa (os de bairro só no zoom ≥ 2, para não poluir).
5. Lista lateral “Regiões” vira um acordeão região → bairros, espelhando o PDF.
6. Retirar o recorte por contorno e as células hexagonais quando houver base ativa (o código já faz isso pelo `tipo`).
7. Acessibilidade: manter a tabela equivalente, agora agrupada por região; nome do bairro + região no `aria-label`.

**Atenção à privacidade**: com bairros reais, muitas células serão suprimidas (números pequenos). Isso é esperado —
conferir com a Secretaria se a granularidade de bairro é publicável ou se o mapa público deve abrir em “Regiões”.

---

## Fase 4 — Hero da página inicial (`HeroMapa.tsx`)

Hoje: contorno esquemático com animação de traço e um ponto pulsando no centroide.

1. Trocar pela **silhueta real** com as **regiões em tons suaves** (`--mapa-1…--mapa-3`, sem escala de valor) e
   divisas finas; animação de desenho região a região (respeitando `prefers-reduced-motion`, como hoje).
2. **Sem dados no hero**: nenhuma cor deve sugerir “região mais violenta”. Tons alternados, não graduados; legenda
   “Regiões de Ubatuba” e não de indicador.
3. Remover o ponto pulsante (no centroide de um mapa real ele cairia num bairro específico e pode ser lido como
   “foco”), ou trocá-lo pelo rótulo “Ubatuba, SP”.
4. **Desempenho**: não enviar GeoJSON na landing. Gerar no build um SVG/`d` pré-projetado e simplificado
   (`src/lib/geo/hero-ubatuba.ts` com as strings `d` por região), mantendo o hero leve e sem JS no cliente.
5. Interação opcional: passar o mouse/foco numa região mostra o nome e “ver no mapa” → `/mapa?regiao=<codigo>`.

---

## Fase 5 — Outros usos

| Onde | Uso |
| --- | --- |
| Landing — nova seção “O território” | Mini-mapa das regiões + lista de bairros por região (sem números), link para `/mapa`. Explica por que o mapa às vezes mostra a região no lugar do bairro. |
| Relatórios PDF (`/api/relatorios`) | Mapa por região embutido no PDF via `svg-to-pdfkit` (já é dependência), com a mesma supressão da publicação. |
| Dashboard interno (`/dashboard`) | Visão por região e bairro com o mesmo componente de mapa, em modo interno. |
| `/admin/geo` | Pré-visualização do GeoJSON enviado sobre o contorno do IBGE antes de ativar (hoje só há a tabela de ligação). |
| `/admin/cadastros` | Indicar bairros sem geometria e geometrias sem bairro. |
| Marca / Open Graph | Silhueta como fundo da imagem de compartilhamento (`opengraph-image`). Os logos de `public/marca/` **não** são alterados. |
| Documentação | Atualizar `PENDENCIAS-INSTITUCIONAIS.md` (itens 1, 2, 11), `METODOLOGIA.md` (base geográfica) e `DICIONARIO-DE-DADOS.md` (`pnpm docs:dicionario`). |

---

## Ordem sugerida e esforço

| # | Entrega | Depende de | Esforço |
| --- | --- | --- | --- |
| 0 | Arquivos no repositório + diagnóstico | — | pequeno |
| 1 | Cadastro real de regiões/bairros | 0 | médio |
| 4 | Hero com silhueta e regiões | 0 (+ 2 se o SVG for por bairro) | pequeno |
| 2 | SVG → GeoJSON georreferenciado | 0, `pnpm geo:ibge` | médio/grande |
| 3 | Mapa com bairros/regiões reais | 1, 2 | médio |
| 5 | Usos complementares | 1–3 | por item |

Testes a cada fase: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e` (o e2e de publicação → mapa deve passar
a usar um bairro real), além de verificação manual em tema claro/escuro e em largura de celular.

## Decisões a confirmar com a Secretaria

1. Os PDFs e o SVG são **oficiais**? De qual órgão e de que data?
2. O mapa público abre por **bairro** ou por **região**?
3. Ilhas (ex.: Anchieta) entram como bairro, como parte de uma região ou ficam fora do mapa?
