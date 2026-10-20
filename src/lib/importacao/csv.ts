import Papa from 'papaparse';
import { tabelaParaLinhas } from './cabecalhos';
import { ErroImportacao, type ResultadoLeitura } from './tipos';

export function lerCsv(texto: string): ResultadoLeitura {
  const linhasTexto = texto.split(/\r?\n/);
  let controle: ResultadoLeitura['controle'] = null;
  const m = /^#omv-modelo[;,\t]([^;,\t\s]+)[;,\t]([^;,\t\s]+)/i.exec(linhasTexto[0] ?? '');
  if (m) controle = { idModelo: m[1], versao: m[2] };
  const corpo = linhasTexto.filter((l) => !l.startsWith('#')).join('\n');
  const cab = corpo.split('\n')[0] ?? '';
  const delim = [';', ',', '\t'].map((d) => [d, cab.split(d).length] as const).sort((a, b) => b[1] - a[1])[0]![0];
  const r = Papa.parse<string[]>(corpo, { delimiter: delim, skipEmptyLines: 'greedy' });
  if (r.errors.some((e) => e.type === 'Quotes')) throw new ErroImportacao('CSV malformado (aspas não fechadas).', 'csv_malformado');
  const t = tabelaParaLinhas(r.data.map((l) => l.map((c) => String(c ?? ''))));
  if (!t) throw new ErroImportacao('Não encontramos o cabeçalho do modelo. Baixe o modelo atual e preencha-o.', 'sem_cabecalho');
  return { formato: 'csv', controle, linhas: t.linhas, achados: t.achados };
}
