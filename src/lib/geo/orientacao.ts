import type { Geometry, Position } from 'geojson';

/** Área planar assinada (lon/lat): positivo = anti-horário. */
function area(anel: Position[]): number {
  let s = 0;
  for (let i = 0; i < anel.length - 1; i++) s += anel[i]![0]! * anel[i + 1]![1]! - anel[i + 1]![0]! * anel[i]![1]!;
  return s / 2;
}

function poligono(an: Position[][]): Position[][] {
  return an.map((anel, i) => {
    const horario = area(anel) < 0;
    // d3-geo: anel externo no sentido horário; furos no anti-horário.
    return (i === 0 ? horario : !horario) ? anel : [...anel].reverse();
  });
}

/** Normaliza a orientação dos anéis para a convenção do d3-geo (evita polígonos "invertidos" que cobrem o globo). */
export function orientarParaD3<G extends Geometry>(g: G): G {
  if (g.type === 'Polygon') return { ...g, coordinates: poligono(g.coordinates) } as G;
  if (g.type === 'MultiPolygon') return { ...g, coordinates: g.coordinates.map(poligono) } as G;
  return g;
}
