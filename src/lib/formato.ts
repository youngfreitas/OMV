const nf = new Intl.NumberFormat('pt-BR');
const nf1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export function fmtNumero(n: number): string {
  return nf.format(n);
}

export function fmtPercentual(frac: number): string {
  return `${nf1.format(frac * 100)}%`;
}

/** Aceita Date ou 'YYYY-MM-DD' e devolve dd/mm/aaaa. */
export function fmtData(d: Date | string): string {
  const s = typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
  const [a, m, dia] = s.split('-');
  return `${dia}/${m}/${a}`;
}

export function fmtDataHora(d: Date): string {
  const f = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(d);
  return f.replace(', ', ' às ').replace(':', 'h');
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** 'YYYY-MM' → 'mar/2026'. */
export function fmtMes(periodo: string): string {
  const [a, m] = periodo.split('-');
  if (!m) return periodo;
  return `${MESES[Number(m) - 1]}/${a}`;
}
