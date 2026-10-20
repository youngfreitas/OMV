import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { dominiosPadrao } from '@/lib/dicionario/dominios';
import { gerarModelo, type FormatoModelo } from '@/lib/modelos';
import { lerArquivo } from '@/lib/importacao';
import { validarEnvio } from '@/lib/validacao/regras';

const listas = { dominios: dominiosPadrao(), bairros: ['Centro', 'Praia Grande'] };
const ctx = {
  dominios: listas.dominios,
  bairros: [
    { codigo: 'b1', nome: 'Centro', ativo: true },
    { codigo: 'b2', nome: 'Praia Grande', ativo: true },
  ],
  hoje: new Date('2026-10-20T12:00:00Z'),
  entidadeId: 'e1',
};
const mime: Record<FormatoModelo, string> = {
  csv: 'text/csv',
  md: 'text/markdown',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const LINHA = ['01/03/2026', '31/03/2026', 'Centro', 'atendimento_servico', 'atendimento', 'psicologica', '25_34', 'acolhimento', '', '', '', '12', ''];

describe('modelos', () => {
  it('geram os quatro formatos e o modelo vazio é rejeitado por não ter linhas', async () => {
    for (const f of ['csv', 'md', 'xlsx', 'docx'] as FormatoModelo[]) {
      const buf = await gerarModelo(f, listas);
      expect(buf.length).toBeGreaterThan(100);
      await expect(lerArquivo(`modelo.${f}`, buf, mime[f])).rejects.toMatchObject({ codigo: 'sem_linhas' });
    }
  });

  it('round-trip CSV: preenche programaticamente, importa e compara', async () => {
    const base = (await gerarModelo('csv', listas)).toString('utf8').replace(/^\uFEFF/, '');
    const csv = base + LINHA.join(';') + '\r\n' + ['01/03/2026', '31/03/2026', 'Praia Grande', 'ocorrencia_policial', 'registro', 'fisica', '35_44', '', '', '', '', '3', ''].join(';') + '\r\n';
    const r = await lerArquivo('envio.csv', Buffer.from(csv, 'utf8'), 'text/csv');
    expect(r.controle).toMatchObject({ idModelo: 'OMV-MULHERES' });
    expect(r.linhas).toHaveLength(2);
    const v = validarEnvio({ linhas: r.linhas }, ctx);
    expect(v.relatorio.resumo.erros).toBe(0);
    expect(v.linhas.map((l) => [l.bairro, l.quantidade])).toEqual([['b1', 12], ['b2', 3]]);
  });

  it('round-trip MD', async () => {
    const md = (await gerarModelo('md', listas)).toString('utf8').replace(/(\| --- )+\|\n(\|[ |]+\|\n){5}/, (m) => m.split('\n')[0] + '\n| 01/03/2026 | 31/03/2026 | Centro | Atendimento em serviço da rede | Atendimentos | Violência psicológica | 25 a 34 anos | Acolhimento |  |  |  | 12 |  |\n');
    const r = await lerArquivo('envio.md', Buffer.from(md), 'text/markdown');
    expect(r.linhas).toHaveLength(1);
    const v = validarEnvio({ linhas: r.linhas }, ctx);
    expect(v.relatorio.resumo.erros).toBe(0);
    expect(v.linhas[0]).toMatchObject({ bairro: 'b1', unidade_contagem: 'atendimento', faixa_etaria: '25_34', quantidade: 12 });
  });

  it('round-trip XLSX (valores preenchidos na planilha Dados)', async () => {
    const buf = await gerarModelo('xlsx', listas);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as never);
    const d = wb.getWorksheet('Dados')!;
    LINHA.forEach((v, i) => {
      const c = d.getCell(2, i + 1);
      c.value = i === 0 ? new Date(Date.UTC(2026, 2, 1)) : i === 1 ? new Date(Date.UTC(2026, 2, 31)) : i === 11 ? 12 : v;
    });
    const preenchido = Buffer.from(await wb.xlsx.writeBuffer());
    const r = await lerArquivo('envio.xlsx', preenchido, mime.xlsx);
    expect(r.controle).toMatchObject({ idModelo: 'OMV-MULHERES', versao: '1.0.0' });
    const v = validarEnvio({ linhas: r.linhas }, ctx);
    expect(v.relatorio.resumo.erros).toBe(0);
    expect(v.linhas[0]).toMatchObject({ periodo_inicio: '2026-03-01', quantidade: 12 });
  });

  it('round-trip DOCX (insere valores na primeira linha da tabela)', async () => {
    const buf = await gerarModelo('docx', listas);
    const zip = await JSZip.loadAsync(buf);
    let xml = await zip.files['word/document.xml']!.async('string');
    // Preenche a primeira linha vazia: troca as primeiras 13 células " " por valores.
    let i = 0;
    xml = xml.replace(/<w:t xml:space="preserve"> <\/w:t>/g, (m) => (i < LINHA.length ? `<w:t>${LINHA[i++] || ' '}</w:t>` : m));
    zip.file('word/document.xml', xml);
    const out = await zip.generateAsync({ type: 'nodebuffer' });
    const r = await lerArquivo('envio.docx', out, mime.docx);
    expect(r.controle).toMatchObject({ idModelo: 'OMV-MULHERES' });
    const v = validarEnvio({ linhas: r.linhas }, ctx);
    expect(r.linhas.length).toBeGreaterThanOrEqual(1);
    expect(v.linhas[0]).toMatchObject({ bairro: 'b1', quantidade: 12 });
  });
});

describe('segurança de arquivos', () => {
  it('rejeita extensão não aceita, assinatura falsa, binário e vazio', async () => {
    await expect(lerArquivo('x.exe', Buffer.from('MZ'), '')).rejects.toMatchObject({ codigo: 'extensao' });
    await expect(lerArquivo('x.xlsm', Buffer.from('PK'), '')).rejects.toMatchObject({ codigo: 'extensao' });
    await expect(lerArquivo('x.xlsx', Buffer.from('%PDF-1.7 ...'), mime.xlsx)).rejects.toMatchObject({ codigo: 'assinatura' });
    await expect(lerArquivo('x.csv', Buffer.from('MZ\x90\x00'), 'text/csv')).rejects.toMatchObject({ codigo: 'assinatura' });
    await expect(lerArquivo('x.csv', Buffer.from('a;b\x00c'), 'text/csv')).rejects.toMatchObject({ codigo: 'binario' });
    await expect(lerArquivo('x.csv', Buffer.alloc(0), 'text/csv')).rejects.toMatchObject({ codigo: 'vazio' });
    await expect(lerArquivo('x.csv', Buffer.from('a'), 'application/x-msdownload')).rejects.toMatchObject({ codigo: 'mime' });
  });

  it('rejeita arquivo acima de 5 MB', async () => {
    await expect(lerArquivo('x.csv', Buffer.alloc(5 * 1024 * 1024 + 1, 97), 'text/csv')).rejects.toMatchObject({ codigo: 'tamanho' });
  });

  it('rejeita XLSX com fórmula', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Dados');
    ws.addRow(['Início do período', 'Fim do período', 'Bairro', 'Tipo de registro', 'Quantidade']);
    ws.addRow(['01/03/2026', '31/03/2026', 'Centro', 'x']).getCell(5).value = { formula: '1+1', result: 2 };
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    await expect(lerArquivo('f.xlsx', buf, mime.xlsx)).rejects.toMatchObject({ codigo: 'formula' });
  });

  it('rejeita arquivo com macro (vbaProject.bin) e objetos incorporados', async () => {
    const base = await gerarModelo('xlsx', listas);
    const zip = await JSZip.loadAsync(base);
    zip.file('xl/vbaProject.bin', Buffer.from('macro'));
    const comMacro = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(lerArquivo('m.xlsx', comMacro, mime.xlsx)).rejects.toMatchObject({ codigo: 'macro_ou_objeto' });
    const z2 = await JSZip.loadAsync(base);
    z2.file('xl/embeddings/oleObject1.bin', Buffer.from('x'));
    await expect(lerArquivo('o.xlsx', await z2.generateAsync({ type: 'nodebuffer' }), mime.xlsx)).rejects.toMatchObject({ codigo: 'macro_ou_objeto' });
  });

  it('rejeita zip-bomb (razão de compressão e tamanho descomprimido)', async () => {
    const base = await gerarModelo('docx', listas);
    const zip = await JSZip.loadAsync(base);
    zip.file('word/media.txt', Buffer.alloc(60 * 1024 * 1024, 0), { compression: 'DEFLATE' });
    const bomba = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    expect(bomba.length).toBeLessThan(5 * 1024 * 1024);
    await expect(lerArquivo('b.docx', bomba, mime.docx)).rejects.toMatchObject({ codigo: 'zip_bomb' });
  });

  it('rejeita DOCX com vínculo externo e XML com DOCTYPE', async () => {
    const base = await gerarModelo('docx', listas);
    const z1 = await JSZip.loadAsync(base);
    z1.file('word/_rels/settings.xml.rels', '<Relationships><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/attachedTemplate" Target="http://evil.example/t.dotm" TargetMode="External"/></Relationships>');
    await expect(lerArquivo('e.docx', await z1.generateAsync({ type: 'nodebuffer' }), mime.docx)).rejects.toMatchObject({ codigo: 'vinculo_externo' });
    const z2 = await JSZip.loadAsync(base);
    const xml = await z2.files['word/document.xml']!.async('string');
    z2.file('word/document.xml', '<!DOCTYPE x [<!ENTITY a "b">]>' + xml);
    await expect(lerArquivo('d.docx', await z2.generateAsync({ type: 'nodebuffer' }), mime.docx)).rejects.toMatchObject({ codigo: 'xml_perigoso' });
  });

  it('versão de modelo incompatível é erro', async () => {
    const csv = '#omv-modelo;OMV-MULHERES;9.0.0\r\n' + (await gerarModelo('csv', listas)).toString('utf8').split('\n')[1] + LINHA.join(';');
    const r = await lerArquivo('v.csv', Buffer.from(csv), 'text/csv');
    expect(r.achados.map((a) => a.codigo)).toContain('modelo_desatualizado');
  });
});
