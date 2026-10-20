import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { tabelaParaLinhas } from './cabecalhos';
import { ErroImportacao, type ResultadoLeitura } from './tipos';

function textoCelula(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'verdadeiro' : 'falso';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((r) => r.text).join('');
    if ('text' in v && typeof v.text === 'string') return v.text; // hiperlink: só o texto
    if ('error' in v) return String(v.error);
    if ('result' in v) return textoCelula(v.result as ExcelJS.CellValue);
  }
  return String(v);
}

export async function lerXlsx(buffer: Buffer): Promise<ResultadoLeitura> {
  // Fórmulas: lidas diretamente do XML das planilhas (só valores são aceitos).
  const zip = await JSZip.loadAsync(buffer);
  for (const nome of Object.keys(zip.files)) {
    if (/^xl\/worksheets\/[^/]+\.xml$/.test(nome)) {
      const xml = await zip.files[nome]!.async('string');
      if (/<f[\s>/]/.test(xml)) {
        throw new ErroImportacao('O arquivo contém fórmulas. Copie e cole apenas os valores e envie novamente.', 'formula');
      }
    }
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as never);
  let controle: ResultadoLeitura['controle'] = null;
  const ctl = wb.getWorksheet('Controle');
  if (ctl && textoCelula(ctl.getCell('A1').value) === 'omv-modelo') {
    controle = { idModelo: textoCelula(ctl.getCell('B1').value), versao: textoCelula(ctl.getCell('C1').value) };
  }
  const folha = wb.worksheets.find((w) => w.name.toLowerCase() === 'dados') ?? wb.worksheets.find((w) => w.state === 'visible' && w.name !== 'Instruções');
  if (!folha) throw new ErroImportacao('Não encontramos a planilha “Dados”.', 'sem_planilha');
  const matriz: string[][] = [];
  folha.eachRow({ includeEmpty: false }, (row) => {
    const cels: string[] = [];
    row.eachCell({ includeEmpty: true }, (c, i) => (cels[i - 1] = textoCelula(c.value)));
    matriz.push(Array.from(cels, (x) => x ?? ''));
  });
  const t = tabelaParaLinhas(matriz);
  if (!t) throw new ErroImportacao('Não encontramos o cabeçalho do modelo na planilha “Dados”.', 'sem_cabecalho');
  return { formato: 'xlsx', controle, linhas: t.linhas, achados: t.achados };
}
