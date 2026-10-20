import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { bairros, basesGeograficas } from '@/lib/db/schema';
import { registrar } from '@/lib/auditoria';
import { ErroNegocio } from '@/lib/auth/erros';
import { exigir } from '@/lib/auth/guards';
import type { UsuarioAtual } from '@/lib/auth/usuario';
import { analisarGeojson, sugerirLigacao, type AnaliseGeo } from '@/lib/geo/importador';
import type { ColecaoGeo } from '@/lib/geo/tipos';

export async function listarBases(u: UsuarioAtual) {
  exigir(u, 'geo:gerenciar');
  return db
    .select({ id: basesGeograficas.id, tipo: basesGeograficas.tipo, versao: basesGeograficas.versao, fonte: basesGeograficas.fonte, oficial: basesGeograficas.oficial, ativa: basesGeograficas.ativa, hash: basesGeograficas.hash, criadoEm: basesGeograficas.criadoEm })
    .from(basesGeograficas)
    .orderBy(desc(basesGeograficas.criadoEm));
}

export async function enviarBase(
  u: UsuarioAtual,
  e: { texto: string; fonte: string; oficial: boolean; versao: string; propId?: string; propNome?: string },
): Promise<{ baseId: string; analise: AnaliseGeo; ligacaoSugerida: Record<string, string> }> {
  exigir(u, 'geo:gerenciar');
  if (e.fonte.trim().length < 5) throw new ErroNegocio('Informe a fonte da base (órgão, documento e data).');
  if (!e.versao.trim()) throw new ErroNegocio('Informe a versão da base.');
  const analise = analisarGeojson(e.texto, { propId: e.propId, propNome: e.propNome });
  if (!analise.ok || !analise.geojson) throw new ErroNegocio(analise.erros.join(' ') || 'GeoJSON inválido.');
  const [b] = await db
    .insert(basesGeograficas)
    .values({ tipo: 'bairros', versao: e.versao.trim().slice(0, 40), fonte: e.fonte.trim().slice(0, 300), oficial: e.oficial, hash: analise.hash!, geojson: analise.geojson as never, ativa: false, criadoPor: u.id })
    .returning();
  const bs = await db.select({ id: bairros.id, nome: bairros.nome }).from(bairros);
  await registrar({ usuarioId: u.id, acao: 'geo.base_enviada', recursoTipo: 'base_geografica', recursoId: b!.id, detalhes: { features: analise.features.length, oficial: e.oficial } });
  return { baseId: b!.id, analise, ligacaoSugerida: sugerirLigacao(analise.features, bs) };
}

export async function ligarEAtivar(u: UsuarioAtual, baseId: string, ligacao: Record<string, string>, ativar: boolean) {
  exigir(u, 'geo:gerenciar');
  const [base] = await db.select().from(basesGeograficas).where(eq(basesGeograficas.id, baseId));
  if (!base) throw new ErroNegocio('Base não encontrada.');
  const featureIds = new Set((base.geojson as ColecaoGeo).features.map((f) => String(f.properties?.id)));
  const usados = new Set<string>();
  for (const [fid, bid] of Object.entries(ligacao)) {
    if (!featureIds.has(fid)) throw new ErroNegocio('Feição inexistente na base.');
    if (usados.has(bid)) throw new ErroNegocio('Um bairro foi ligado a mais de uma feição.');
    usados.add(bid);
  }
  await db.transaction(async (tx) => {
    // Limpa ligações anteriores e grava as novas.
    await tx.update(bairros).set({ geoFeatureId: null });
    for (const [fid, bid] of Object.entries(ligacao)) await tx.update(bairros).set({ geoFeatureId: fid }).where(eq(bairros.id, bid));
    if (ativar) {
      await tx.update(basesGeograficas).set({ ativa: false }).where(and(eq(basesGeograficas.tipo, 'bairros'), eq(basesGeograficas.ativa, true)));
      await tx.update(basesGeograficas).set({ ativa: true }).where(eq(basesGeograficas.id, baseId));
    }
  });
  await registrar({ usuarioId: u.id, acao: ativar ? 'geo.base_ativada' : 'geo.ligacao_salva', recursoTipo: 'base_geografica', recursoId: baseId, detalhes: { ligados: Object.keys(ligacao).length } });
}

export async function desativarBase(u: UsuarioAtual, baseId: string) {
  exigir(u, 'geo:gerenciar');
  await db.update(basesGeograficas).set({ ativa: false }).where(eq(basesGeograficas.id, baseId));
  await registrar({ usuarioId: u.id, acao: 'geo.base_desativada', recursoTipo: 'base_geografica', recursoId: baseId });
}

export async function bairrosParaLigacao(u: UsuarioAtual) {
  exigir(u, 'geo:gerenciar');
  return db.select({ id: bairros.id, nome: bairros.nome }).from(bairros).orderBy(bairros.nome);
}
