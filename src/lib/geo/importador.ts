import { createHash } from 'node:crypto';
import type { Feature, Geometry } from 'geojson';
import { chaveTexto } from '../validacao/normalizar';
import { orientarParaD3 } from './orientacao';
import type { ColecaoGeo, FeatureGeo } from './tipos';

export const LIMITE_GEOJSON_BYTES = 10 * 1024 * 1024;
const MAX_FEATURES = 500;
// Caixa aproximada em torno de Ubatuba (apenas aviso, nunca bloqueio).
const CAIXA = { lonMin: -45.5, lonMax: -44.7, latMin: -23.75, latMax: -23.2 };

export type AnaliseGeo = {
  ok: boolean;
  erros: string[];
  avisos: string[];
  geojson?: ColecaoGeo;
  hash?: string;
  propriedadesCandidatas: string[];
  features: Array<{ id: string; nome: string }>;
};

function arredondar(c: unknown): unknown {
  if (typeof c === 'number') return Math.round(c * 1e6) / 1e6;
  return Array.isArray(c) ? c.map(arredondar) : c;
}

function percorrer(c: unknown, fn: (lon: number, lat: number) => void) {
  if (Array.isArray(c) && typeof c[0] === 'number') fn(c[0] as number, c[1] as number);
  else if (Array.isArray(c)) for (const x of c) percorrer(x, fn);
}

/**
 * Valida e SANEIA um GeoJSON de bairros: só geometrias de polígono, propriedades mínimas (id e nome),
 * coordenadas arredondadas. Nada de dados pessoais, scripts ou propriedades arbitrárias é mantido.
 */
export function analisarGeojson(texto: string, opcoes: { propId?: string; propNome?: string } = {}): AnaliseGeo {
  const erros: string[] = [];
  const avisos: string[] = [];
  const vazio = (): AnaliseGeo => ({ ok: false, erros, avisos, propriedadesCandidatas: [], features: [] });
  if (Buffer.byteLength(texto) > LIMITE_GEOJSON_BYTES) {
    erros.push('Arquivo maior que 10 MB.');
    return vazio();
  }
  let j: unknown;
  try {
    j = JSON.parse(texto);
  } catch {
    erros.push('O arquivo não é um JSON válido.');
    return vazio();
  }
  const g = j as { type?: string; features?: Feature[] };
  if (g?.type !== 'FeatureCollection' || !Array.isArray(g.features)) {
    erros.push('O arquivo deve ser um GeoJSON do tipo FeatureCollection.');
    return vazio();
  }
  if (g.features.length === 0) erros.push('O GeoJSON não possui feições.');
  if (g.features.length > MAX_FEATURES) erros.push(`Feições demais (máximo ${MAX_FEATURES}).`);
  const props = new Set<string>();
  for (const f of g.features.slice(0, 50)) for (const k of Object.keys(f?.properties ?? {})) props.add(k);
  const candidatas = [...props];
  const propId = opcoes.propId ?? candidatas.find((k) => /^(id|codigo|cod|cd_bairro|cd_|code)$/i.test(k)) ?? candidatas.find((k) => /id|cod/i.test(k));
  const propNome = opcoes.propNome ?? candidatas.find((k) => /^(nome|name|bairro|nm_bairro|nm_)$/i.test(k)) ?? candidatas.find((k) => /nome|name/i.test(k));
  if (erros.length) return { ...vazio(), propriedadesCandidatas: candidatas };

  const feats: FeatureGeo[] = [];
  const ids = new Set<string>();
  let fora = 0;
  g.features.forEach((f, i) => {
    const geom = f?.geometry as Geometry | null;
    if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) {
      erros.push(`Feição ${i + 1}: geometria deve ser Polygon ou MultiPolygon.`);
      return;
    }
    let ok = true;
    percorrer((geom as { coordinates: unknown }).coordinates, (lon, lat) => {
      if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90) ok = false;
      else if (lon < CAIXA.lonMin || lon > CAIXA.lonMax || lat < CAIXA.latMin || lat > CAIXA.latMax) fora++;
    });
    if (!ok) {
      erros.push(`Feição ${i + 1}: coordenadas inválidas.`);
      return;
    }
    const idBruto = propId ? f.properties?.[propId] : (f as { id?: unknown }).id;
    const id = String(idBruto ?? `f${i + 1}`).slice(0, 60);
    if (ids.has(id)) {
      erros.push(`Identificador repetido: ${id}.`);
      return;
    }
    ids.add(id);
    const nome = String((propNome ? f.properties?.[propNome] : '') ?? '').slice(0, 120) || `Área ${i + 1}`;
    feats.push({ type: 'Feature', properties: { id, nome }, geometry: orientarParaD3({ type: geom.type, coordinates: arredondar((geom as { coordinates: unknown }).coordinates) } as Geometry) });
  });
  if (fora > 0) avisos.push('Há coordenadas fora da região esperada de Ubatuba. Confira se é o arquivo correto.');
  if (!propId) avisos.push('Não foi possível identificar a propriedade de identificador; foram usados números sequenciais.');
  const geojson: ColecaoGeo = { type: 'FeatureCollection', features: feats };
  return {
    ok: erros.length === 0,
    erros,
    avisos,
    geojson,
    hash: createHash('sha256').update(JSON.stringify(geojson)).digest('hex'),
    propriedadesCandidatas: candidatas,
    features: feats.map((f) => ({ id: String(f.properties.id), nome: String(f.properties.nome) })),
  };
}

/** Sugere a ligação feição ↔ bairro pelo nome (sem acentos/caixa). */
export function sugerirLigacao(features: Array<{ id: string; nome: string }>, bairros: Array<{ id: string; nome: string }>): Record<string, string> {
  const idx = new Map(bairros.map((b) => [chaveTexto(b.nome), b.id]));
  const out: Record<string, string> = {};
  for (const f of features) {
    const b = idx.get(chaveTexto(f.nome));
    if (b) out[f.id] = b;
  }
  return out;
}
