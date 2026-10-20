import { geoMercator, geoPath } from 'd3-geo';
import { orientarParaD3 } from './orientacao';
import type { ColecaoGeo } from './tipos';

export type CaminhoSvg = { id: string; nome: string; d: string; cx: number; cy: number };

/** Projeta uma coleção GeoJSON em caminhos SVG (sem tiles externos). */
export function projetar(
  colecao: ColecaoGeo,
  largura: number,
  altura: number,
  enquadrar: ColecaoGeo = colecao,
  margem = 12,
): CaminhoSvg[] {
  const orientar = (c: ColecaoGeo): ColecaoGeo => ({ ...c, features: c.features.map((f) => ({ ...f, geometry: orientarParaD3(f.geometry) })) });
  colecao = orientar(colecao);
  enquadrar = enquadrar === colecao ? colecao : orientar(enquadrar);
  const proj = geoMercator().fitExtent(
    [
      [margem, margem],
      [largura - margem, altura - margem],
    ],
    { type: 'FeatureCollection', features: enquadrar.features } as never,
  );
  const path = geoPath(proj);
  return colecao.features.flatMap((f, i) => {
    const d = path(f as never);
    if (!d) return [];
    const [cx, cy] = path.centroid(f as never);
    return [
      {
        id: String(f.properties?.id ?? f.properties?.codigoIbge ?? `f${i}`),
        nome: String(f.properties?.nome ?? `Área ${i + 1}`),
        d,
        cx: cx ?? 0,
        cy: cy ?? 0,
      },
    ];
  });
}
