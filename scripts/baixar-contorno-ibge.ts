/**
 * Baixa o contorno OFICIAL do município de Ubatuba (código IBGE 3555406) da API de malhas do IBGE
 * e grava em src/lib/geo/contorno-ubatuba.json registrando fonte, data e hash.
 *
 * Uso: pnpm geo:ibge
 * Requer acesso HTTPS a servicodados.ibge.gov.br.
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const CODIGO = '3555406';
const URL_IBGE = `https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${CODIGO}?formato=application/vnd.geo+json&qualidade=maxima`;

async function main() {
  const r = await fetch(URL_IBGE);
  if (!r.ok) throw new Error(`IBGE respondeu ${r.status}. Verifique a conectividade e tente novamente.`);
  const gj = (await r.json()) as { type: string; features: Array<{ type: string; properties?: Record<string, unknown>; geometry: unknown }> };
  if (gj.type !== 'FeatureCollection' || !gj.features?.length) throw new Error('Resposta inesperada do IBGE.');
  const texto = JSON.stringify(gj.features);
  const hash = createHash('sha256').update(texto).digest('hex');
  const saida = {
    type: 'FeatureCollection',
    metadata: {
      codigoIbge: CODIGO,
      nome: 'Ubatuba',
      oficial: true,
      fonte: `IBGE — API de Malhas Geográficas (v3), município ${CODIGO}, qualidade máxima. Baixado de ${URL_IBGE}`,
      dataCarga: new Date().toISOString().slice(0, 10),
      sha256: hash,
    },
    features: gj.features.map((f) => ({ type: 'Feature', properties: { codigoIbge: CODIGO, nome: 'Ubatuba' }, geometry: f.geometry })),
  };
  writeFileSync('src/lib/geo/contorno-ubatuba.json', JSON.stringify(saida));
  console.log(`Contorno oficial gravado (sha256 ${hash.slice(0, 16)}…). Faça o commit do arquivo.`);
}
main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
