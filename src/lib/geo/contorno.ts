import contorno from './contorno-ubatuba.json';
import type { ColecaoGeo } from './tipos';

export const CONTORNO_MUNICIPIO = contorno as unknown as ColecaoGeo;
export const CONTORNO_OFICIAL = CONTORNO_MUNICIPIO.metadata?.oficial === true;
export const FONTE_CONTORNO = CONTORNO_MUNICIPIO.metadata?.fonte ?? 'Fonte não informada';
