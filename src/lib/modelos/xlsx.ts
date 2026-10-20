import ExcelJS from 'exceljs';
import { CAMPOS_LINHA } from '../dicionario/campos';
import { DECLARACAO_SEM_DADOS_PESSOAIS, IDENTIFICACAO, TEXTO_INSTRUCOES, listaDominio, rotuloDominio, type ListasModelo } from './comum';

const LINHAS_DADOS = 1000;

function colLetra(n: number): string {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export async function gerarXlsx(listas: ListasModelo): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'OMV Ubatuba';
  wb.title = `Modelo ${IDENTIFICACAO.id} ${IDENTIFICACAO.versao}`;

  // Instruções
  const ins = wb.addWorksheet('Instruções');
  ins.getColumn(1).width = 28;
  ins.getColumn(2).width = 14;
  ins.getColumn(3).width = 80;
  ins.getColumn(4).width = 22;
  ins.addRow([`OMV — Modelo de envio (${IDENTIFICACAO.id} v${IDENTIFICACAO.versao})`]).font = { bold: true, size: 14 };
  ins.addRow([]);
  for (const t of TEXTO_INSTRUCOES) ins.addRow([t]);
  ins.addRow([]);
  ins.addRow([DECLARACAO_SEM_DADOS_PESSOAIS]).font = { italic: true };
  ins.addRow([]);
  const h = ins.addRow(['Campo', 'Obrigatório', 'Ajuda', 'Exemplo']);
  h.font = { bold: true };
  for (const c of CAMPOS_LINHA) {
    ins.addRow([c.rotulo, c.obrigatorio ? 'sim' : c.condicional ? 'condicional' : 'não', c.ajuda, c.exemplo]);
  }

  // Listas
  const lis = wb.addWorksheet('Listas');
  const intervalos = new Map<string, string>();
  let col = 1;
  const doms = [...new Set(CAMPOS_LINHA.flatMap((c) => (c.dominio ? [c.dominio] : [])))];
  for (const d of doms) {
    const itens = listaDominio(listas, d);
    lis.getCell(1, col).value = rotuloDominio(d);
    lis.getCell(1, col).font = { bold: true };
    itens.forEach((v, i) => (lis.getCell(i + 2, col).value = v));
    lis.getColumn(col).width = 38;
    intervalos.set(d, `Listas!$${colLetra(col)}$2:$${colLetra(col)}$${Math.max(2, itens.length + 1)}`);
    col++;
  }

  // Dados
  const dados = wb.addWorksheet('Dados', { views: [{ state: 'frozen', ySplit: 1 }] });
  dados.columns = CAMPOS_LINHA.map((c) => ({ header: c.rotulo, key: c.chave, width: Math.max(18, c.rotulo.length + 4) }));
  const cab = dados.getRow(1);
  cab.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cab.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3E1F5F' } };
  cab.alignment = { wrapText: true, vertical: 'middle' };
  cab.height = 32;
  CAMPOS_LINHA.forEach((c, i) => {
    const letra = colLetra(i + 1);
    const nota = `${c.ajuda}${c.exemplo ? ` Exemplo: ${c.exemplo}` : ''}`;
    cab.getCell(i + 1).note = nota;
    for (let r = 2; r <= LINHAS_DADOS + 1; r++) {
      const cel = dados.getCell(`${letra}${r}`);
      if (c.tipo === 'data') {
        cel.numFmt = 'dd/mm/yyyy';
        cel.dataValidation = { type: 'date', operator: 'greaterThan', allowBlank: true, formulae: [new Date(Date.UTC(2000, 0, 1))], showErrorMessage: true, errorTitle: 'Data inválida', error: 'Informe uma data válida (dd/mm/aaaa).' };
      } else if (c.tipo === 'inteiro') {
        cel.dataValidation = { type: 'whole', operator: 'greaterThanOrEqual', allowBlank: true, formulae: [0], showErrorMessage: true, errorTitle: 'Quantidade inválida', error: 'Informe um número inteiro maior ou igual a zero.' };
      } else if (c.tipo === 'dominio' && c.dominio) {
        cel.dataValidation = { type: 'list', allowBlank: true, formulae: [intervalos.get(c.dominio)!], showErrorMessage: true, errorTitle: 'Valor fora da lista', error: 'Escolha um valor da lista.' };
      }
    }
  });

  // Controle (oculta): identificação e versão do modelo.
  const ctl = wb.addWorksheet('Controle', { state: 'veryHidden' });
  ctl.getCell('A1').value = 'omv-modelo';
  ctl.getCell('B1').value = IDENTIFICACAO.id;
  ctl.getCell('C1').value = IDENTIFICACAO.versao;

  return Buffer.from(await wb.xlsx.writeBuffer());
}
