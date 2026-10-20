import { CONTORNO_MUNICIPIO, CONTORNO_OFICIAL } from '@/lib/geo/contorno';
import { projetar } from '@/lib/geo/projecao';

/** Mapa estilizado do contorno do município (sem dados). Animação desligada com prefers-reduced-motion. */
export function HeroMapa() {
  const [forma] = projetar(CONTORNO_MUNICIPIO, 560, 400);
  if (!forma) return null;
  return (
    <figure className="hero-mapa">
      <svg viewBox="0 0 560 400" role="img" aria-labelledby="hero-mapa-t hero-mapa-d">
        <title id="hero-mapa-t">Contorno do município de Ubatuba</title>
        <desc id="hero-mapa-d">
          Ilustração do limite municipal, sem dados. {CONTORNO_OFICIAL ? '' : 'Contorno esquemático provisório.'}
        </desc>
        <path className="hero-mapa-sombra" d={forma.d} transform="translate(6 8)" />
        <path className="hero-mapa-forma" d={forma.d} pathLength={1} />
        <circle className="hero-mapa-ponto" cx={forma.cx} cy={forma.cy} r="5" />
      </svg>
      <figcaption className="omv-legenda">
        Ubatuba, SP{CONTORNO_OFICIAL ? '' : ' · contorno esquemático provisório (não oficial)'}
      </figcaption>
    </figure>
  );
}
