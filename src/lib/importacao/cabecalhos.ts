import { CAMPOS_LINHA, type LinhaBruta } from '../dicionario/campos';
import { mapaCabecalhos } from '../modelos/comum';
import { chaveTexto } from '../validacao/normalizar';
import type { Achado } from '../validacao/tipos';

const MAPA = mapaCabecalhos();

export function reconhecer(cel: string): string | undefined {
  return MAPA.get(chaveTexto(cel));
}

/** Procura a linha de cabeçalho (≥ 4 colunas reconhecidas) e devolve as demais como objetos. */
export function tabelaParaLinhas(matriz: string[][]): { linhas: LinhaBruta[]; achados: Achado[] } | null {
  const ix = matriz.findIndex((r) => r.filter((c) => reconhecer(c)).length >= 4);
  if (ix < 0) return null;
  const cab = matriz[ix]!.map((c) => reconhecer(c));
  const achados: Achado[] = [];
  const ausentes = CAMPOS_LINHA.filter((c) => c.obrigatorio && !cab.includes(c.chave));
  for (const c of ausentes) achados.push({ nivel: 'erro', codigo: 'coluna_ausente', mensagem: `Coluna obrigatória ausente: ${c.rotulo}.` });
  const desconhecidas = matriz[ix]!.filter((c, i) => c.trim() && !cab[i]);
  if (desconhecidas.length) {
    achados.push({ nivel: 'alerta', codigo: 'coluna_desconhecida', mensagem: `${desconhecidas.length} coluna(s) fora do modelo foram ignoradas.` });
  }
  const linhas: LinhaBruta[] = [];
  for (const r of matriz.slice(ix + 1)) {
    const o: LinhaBruta = {};
    r.forEach((v, i) => {
      const k = cab[i];
      if (k) o[k] = v;
    });
    if (Object.values(o).some((v) => (v ?? '').trim() !== '')) linhas.push(o);
  }
  return { linhas, achados };
}
