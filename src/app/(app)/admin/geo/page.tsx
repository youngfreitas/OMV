import { Banner, Pagina, StatusBadge, Table } from '@/components/ds';
import { requirePermission } from '@/lib/auth/guards';
import { fmtDataHora } from '@/lib/formato';
import { CONTORNO_OFICIAL, FONTE_CONTORNO } from '@/lib/geo/contorno';
import { bairrosParaLigacao, listarBases } from '@/server/geo-admin';
import { ImportadorGeo, LinhaBase } from './ImportadorGeo';

export const metadata = { title: 'Base geográfica' };

export default async function Geo() {
  const u = await requirePermission('geo:gerenciar');
  const [bases, bairros] = await Promise.all([listarBases(u), bairrosParaLigacao(u)]);
  return (
    <Pagina titulo="Base geográfica" descricao="Importe o GeoJSON oficial de bairros e ligue cada feição ao cadastro de bairros. Enquanto não houver base ativa, o mapa público mostra apenas o contorno do município.">
      <Banner tipo={CONTORNO_OFICIAL ? 'info' : 'alerta'} titulo={CONTORNO_OFICIAL ? 'Contorno municipal oficial carregado' : 'Contorno municipal PROVISÓRIO'}>{FONTE_CONTORNO}</Banner>
      <ImportadorGeo bairros={bairros} />
      <Table legenda="Bases geográficas importadas">
        <thead><tr><th>Versão</th><th>Fonte</th><th>Situação</th><th>Enviada em</th><th>Impressão digital</th><th /></tr></thead>
        <tbody>
          {bases.map((b) => (
            <tr key={b.id}>
              <td>{b.versao}</td>
              <td>{b.fonte}</td>
              <td>
                <StatusBadge status={b.ativa ? 'publicado' : 'rascunho'}>{b.ativa ? 'Ativa' : 'Inativa'}</StatusBadge> {b.oficial ? null : <StatusBadge status="em_analise">Não oficial</StatusBadge>}
              </td>
              <td>{fmtDataHora(b.criadoEm)}</td>
              <td><code>{b.hash.slice(0, 12)}</code></td>
              <td><LinhaBase id={b.id} ativa={b.ativa} /></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Pagina>
  );
}
