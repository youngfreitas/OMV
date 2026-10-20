import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { gerarPdf } from '@/lib/relatorios/pdf';
import { gerarXlsxRelatorio, seguroXlsx } from '@/lib/relatorios/xlsx';
import type { DadosRelatorio } from '@/lib/relatorios/tipos';

const cel = (rotulo: string, valor: number | null) => ({ codigo: rotulo, rotulo, valor, suprimido: valor === null });
const dados = (restrito: boolean): DadosRelatorio => ({
  unidadeRotulo: 'Atendimentos',
  geradoEm: new Date('2026-10-20T12:00:00Z'),
  geradoPor: 'Teste',
  painel: {
    restrito, disponivel: true, unidade: 'atendimento', unidades: [], periodo: 'todos', periodos: ['todos'], periodoRotulo: 'Todo o período',
    total: { valor: 120, suprimido: false },
    serie: [{ periodo: '2026-01', rotulo: 'jan/2026', valor: 60, suprimido: false }, { periodo: '2026-02', rotulo: 'fev/2026', valor: null, suprimido: true }],
    porCategoria: [cel('Violência física', 50), cel('=HYPERLINK("http://x")', null)],
    porFaixa: [cel('18 a 24 anos', 30)], porTipo: [cel('Atendimento em serviço da rede', 120)],
    porTerritorio: [{ tipo: 'regiao', codigo: 'r1', rotulo: 'Região A', valor: 70, suprimido: false }, { tipo: 'bairro', codigo: 'b1', rotulo: 'Centro', valor: null, suprimido: true }],
    comparacao: { anteriorRotulo: 'ano anterior', anterior: 100, variacaoPct: 20 },
    cobertura: { entidades: 2, entidadesAnterior: 2 }, notas: ['Nota metodológica de teste.'],
  },
});

describe('relatórios', () => {
  it('PDF é gerado com a assinatura correta, inclusive com valores suprimidos', async () => {
    const buf = await gerarPdf(dados(true));
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(5000);
    expect((await gerarPdf(dados(false))).length).toBeGreaterThan(5000);
  });
  it('XLSX: células suprimidas ficam vazias e textos perigosos são neutralizados', async () => {
    const buf = await gerarXlsxRelatorio(dados(true));
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as never);
    const ws = wb.getWorksheet('Categoria')!;
    expect(ws.getRow(3).getCell(2).value).toBeNull();
    expect(String(ws.getRow(3).getCell(1).value).startsWith("'=")).toBe(true);
    expect(ws.getRow(3).getCell(3).value).toBe('suprimido');
    expect(seguroXlsx('+cmd')).toBe("'+cmd");
    expect(seguroXlsx('Normal')).toBe('Normal');
  });
});
