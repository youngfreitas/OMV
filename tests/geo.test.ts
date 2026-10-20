import { describe, expect, it } from 'vitest';
import { analisarGeojson, sugerirLigacao } from '@/lib/geo/importador';
import { gerarCelulasDemo } from '@/lib/geo/celulas-demo';
import { CONTORNO_MUNICIPIO } from '@/lib/geo/contorno';
import { projetar } from '@/lib/geo/projecao';

const poly = (id: string, nome: string, x = -45.05) => ({
  type: 'Feature', properties: { cod: id, nome, segredo: 'x', telefone: '(12) 99999-0000' },
  geometry: { type: 'Polygon', coordinates: [[[x, -23.4], [x + 0.01, -23.4], [x + 0.01, -23.41], [x, -23.4]]] },
});

describe('importador GeoJSON', () => {
  it('aceita polígonos, mantém só id e nome e arredonda coordenadas', () => {
    const r = analisarGeojson(JSON.stringify({ type: 'FeatureCollection', features: [poly('1', 'Centro'), poly('2', 'Praia Grande', -45.1)] }));
    expect(r.ok).toBe(true);
    expect(r.features).toEqual([{ id: '1', nome: 'Centro' }, { id: '2', nome: 'Praia Grande' }]);
    const txt = JSON.stringify(r.geojson);
    expect(txt).not.toContain('telefone');
    expect(txt).not.toContain('segredo');
  });
  it('rejeita JSON inválido, tipos errados, pontos e ids repetidos', () => {
    expect(analisarGeojson('{').ok).toBe(false);
    expect(analisarGeojson('{"type":"Feature"}').ok).toBe(false);
    const ponto = { type: 'Feature', properties: { id: 1 }, geometry: { type: 'Point', coordinates: [-45, -23.4] } };
    expect(analisarGeojson(JSON.stringify({ type: 'FeatureCollection', features: [ponto] })).erros[0]).toMatch(/Polygon/);
    const r = analisarGeojson(JSON.stringify({ type: 'FeatureCollection', features: [poly('1', 'A'), poly('1', 'B')] }));
    expect(r.ok).toBe(false);
  });
  it('avisa sobre coordenadas fora de Ubatuba e sugere ligação por nome', () => {
    const r = analisarGeojson(JSON.stringify({ type: 'FeatureCollection', features: [poly('1', 'Centro', -50)] }));
    expect(r.avisos.join(' ')).toMatch(/fora da região/);
    expect(sugerirLigacao([{ id: '1', nome: 'CENTRO' }], [{ id: 'b', nome: 'Centro' }])).toEqual({ '1': 'b' });
  });
});

describe('células demonstrativas e projeção', () => {
  it('geram hexágonos identificados como demonstrativos e projetam em SVG', () => {
    const c = gerarCelulasDemo(CONTORNO_MUNICIPIO);
    expect(c.features.length).toBeGreaterThan(10);
    expect(c.features.every((f) => f.properties.demonstrativa === true)).toBe(true);
    const caminhos = projetar(c, 800, 560, CONTORNO_MUNICIPIO);
    expect(caminhos).toHaveLength(c.features.length);
    expect(caminhos[0]!.d.startsWith('M')).toBe(true);
  });
});
