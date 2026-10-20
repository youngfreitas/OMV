export function semAcentos(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Chave de comparação: sem acentos, minúscula, espaços e pontuação colapsados. */
export function chaveTexto(s: string): string {
  return semAcentos(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Aceita dd/mm/aaaa, dd-mm-aaaa, aaaa-mm-dd e ISO com hora. Devolve aaaa-mm-dd válido ou null. */
export function normalizarData(v: string): string | null {
  const s = v.trim();
  let a: number, m: number, d: number;
  let r: RegExpExecArray | null;
  if ((r = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(s))) {
    [a, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])];
  } else if ((r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s))) {
    [d, m, a] = [Number(r[1]), Number(r[2]), Number(r[3])];
  } else return null;
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Inteiro não negativo a partir de texto ("12", "12,0" ou "1.234"). Retorna null se não for inteiro; NaN-safe. */
export function normalizarInteiro(v: string): { valor: number | null; motivo?: 'vazio' | 'nao_inteiro' | 'negativo' } {
  const s = v.trim();
  if (s === '') return { valor: null, motivo: 'vazio' };
  const limpo = s.replace(/\s/g, '');
  // 1.234 (milhar) → 1234; 12,0 → 12
  const semMilhar = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(limpo) ? limpo.replace(/\./g, '') : limpo;
  const dec = semMilhar.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(dec)) return { valor: null, motivo: 'nao_inteiro' };
  const n = Number(dec);
  if (!Number.isInteger(n)) return { valor: null, motivo: 'nao_inteiro' };
  if (n < 0) return { valor: null, motivo: 'negativo' };
  return { valor: n };
}

export function mesDe(data: string): string {
  return data.slice(0, 7);
}
