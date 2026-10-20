import type { Feature, FeatureCollection, Geometry } from 'geojson';

export type PropsGeo = { id?: string; nome?: string; [k: string]: unknown };
export type FeatureGeo = Feature<Geometry, PropsGeo>;
export type ColecaoGeo = FeatureCollection<Geometry, PropsGeo> & {
  metadata?: { oficial?: boolean; fonte?: string; dataCarga?: string; [k: string]: unknown };
};
