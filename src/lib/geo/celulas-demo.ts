import { geoContains, geoBounds } from 'd3-geo';
import type { ColecaoGeo, FeatureGeo } from './tipos';

/**
 * Células hexagonais DEMONSTRATIVAS. Não representam bairros nem regiões.
 * Usadas apenas no modo demonstração, enquanto a base oficial de bairros não é carregada.
 */
export function gerarCelulasDemo(contorno: ColecaoGeo, passo = 0.045): ColecaoGeo {
  const [[x0, y0], [x1, y1]] = geoBounds({ type: 'FeatureCollection', features: contorno.features } as never);
  const h = passo;
  const dx = h * Math.sqrt(3);
  const dy = h * 1.5;
  const features: FeatureGeo[] = [];
  let n = 0;
  for (let row = 0, y = y0 - h; y <= y1 + h; y += dy, row++) {
    for (let x = x0 - h + (row % 2 ? dx / 2 : 0); x <= x1 + h; x += dx) {
      const vertices: Array<[number, number]> = [];
      for (let k = 0; k < 6; k++) {
        const ang = (Math.PI / 180) * (30 - 60 * k); // sentido horário (convenção do d3-geo)
        vertices.push([x + h * Math.cos(ang), y + h * Math.sin(ang)]);
      }
      const dentro = [[x, y] as [number, number], ...vertices].some((p) =>
        contorno.features.some((f) => geoContains(f as never, p)),
      );
      if (!dentro) continue;
      n++;
      const id = `demo-${String(n).padStart(3, '0')}`;
      features.push({
        type: 'Feature',
        properties: { id, nome: `Célula demonstrativa ${String(n).padStart(2, '0')}`, demonstrativa: true },
        geometry: { type: 'Polygon', coordinates: [[...vertices, vertices[0]!]] },
      });
    }
  }
  return {
    type: 'FeatureCollection',
    features,
    metadata: {
      oficial: false,
      fonte: 'Células hexagonais demonstrativas — não representam bairros.',
    },
  };
}
