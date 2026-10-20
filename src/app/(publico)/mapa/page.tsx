import { MapaInterativo } from '@/components/mapa/MapaInterativo';
import { consultarIndicadoresPublicos, geoPublico } from '@/server/publico';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mapa de indicadores', description: 'Indicadores públicos agregados e protegidos sobre violência doméstica contra mulheres em Ubatuba.' };

export default async function Mapa() {
  const [geo, ind] = await Promise.all([geoPublico(), consultarIndicadoresPublicos({ cubo: 'territorio' })]);
  return (
    <div className="sec-miolo" style={{ padding: 'var(--espaco-8) var(--espaco-4)' }}>
      <p className="omv-sobrelinha">Consulta pública</p>
      <h1 className="hero-titulo" style={{ fontSize: 'clamp(28px,4vw,40px)' }}>Mapa de indicadores</h1>
      <p className="hero-sub" style={{ fontSize: 16, marginBottom: 'var(--espaco-6)' }}>
        Valores agregados por território, com supressão de números pequenos. Registros, atendimentos e pessoas atendidas são medidas distintas.
      </p>
      <MapaInterativo geoInicial={geo} inicial={ind} />
    </div>
  );
}
