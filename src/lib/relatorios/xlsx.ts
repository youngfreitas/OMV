import ExcelJS from 'exceljs';
import { fmtDataHora } from '../formato';
import type { Celula } from '@/server/dados';
import type { DadosRelatorio } from './tipos';

/** Evita injeção de fórmulas em planilhas: textos que começam com = + - @ recebem apóstrofo. */
export function seguroXlsx(t: string): string {
  return /^[=+\-@\t\r]/.test(t) ? `'${t}` : t;
}

export async function gerarXlsxRelatorio(d: DadosRelatorio): Promise<Buffer> {
  const p = d.painel;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'OMV Ubatuba';
  const estiloCab = (ws: ExcelJS.Worksheet) => {
    const r = ws.getRow(1);
    r.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3E1F5F' } };
  };
  const resumo = wb.addWorksheet('Resumo');
  resumo.columns = [{ width: 38 }, { width: 70 }];
  resumo.addRows([
    ['OMV — Relatório de indicadores'],
    ['Unidade de contagem', d.unidadeRotulo],
    ['Período', p.periodoRotulo],
    ['Valor total', p.total.suprimido ? 'suprimido' : p.total.valor],
    ['Fonte', 'Registros aprovados enviados por entidades da rede'],
    ['Tratamento', p.restrito ? 'Com supressão estatística' : 'DADOS INTERNOS SEM SUPRESSÃO — NÃO DIVULGAR'],
    ['Gerado em', fmtDataHora(d.geradoEm)],
    [],
    ...p.notas.map((n) => ['Nota', n]),
    ['Nota', 'Parâmetros de supressão são PROVISÓRIOS até validação institucional.'],
  ]);
  resumo.getRow(1).font = { bold: true, size: 14 };
  const folha = (nome: string, itens: Array<Celula | { rotulo: string; valor: number | null; suprimido: boolean }>) => {
    const ws = wb.addWorksheet(nome);
    ws.columns = [{ header: 'Categoria', key: 'r', width: 44 }, { header: d.unidadeRotulo, key: 'v', width: 20 }, { header: 'Situação', key: 's', width: 18 }];
    for (const i of itens) ws.addRow({ r: seguroXlsx(i.rotulo), v: i.suprimido ? null : i.valor, s: i.suprimido ? 'suprimido' : 'publicável' });
    estiloCab(ws);
  };
  folha('Série mensal', p.serie.map((s) => ({ rotulo: s.rotulo, valor: s.valor, suprimido: s.suprimido })));
  folha('Categoria', p.porCategoria);
  folha('Faixa etária', p.porFaixa);
  folha('Tipo de registro', p.porTipo);
  folha('Território', p.porTerritorio.map((t) => ({ rotulo: `${t.tipo === 'regiao' ? 'Região' : 'Bairro'}: ${t.rotulo}`, valor: t.valor, suprimido: t.suprimido })));
  return Buffer.from(await wb.xlsx.writeBuffer());
}
