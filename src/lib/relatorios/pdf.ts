import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fmtDataHora, fmtNumero } from '../formato';
import type { Celula } from '@/server/dados';
import type { DadosRelatorio } from './tipos';

const COR = { roxo: '#3E1F5F', rosa: '#D857A6', lilas: '#B68CD9', texto: '#2A1840', suave: '#655877', linha: '#E4DDEC', fundo: '#F6F4F9', viz4: '#8C7DA0' };

function fonte(arq: string) {
  return readFileSync(join(process.cwd(), 'node_modules/@fontsource/plus-jakarta-sans/files', arq));
}

export async function gerarPdf(d: DadosRelatorio): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 64, left: 48, right: 48 }, bufferPages: true, info: { Title: `OMV — Relatório (${d.unidadeRotulo}, ${d.painel.periodoRotulo})`, Author: 'OMV Ubatuba' } });
  doc.registerFont('texto', fonte('plus-jakarta-sans-latin-400-normal.woff'));
  doc.registerFont('forte', fonte('plus-jakarta-sans-latin-600-normal.woff'));
  doc.registerFont('titulo', fonte('plus-jakarta-sans-latin-700-normal.woff'));
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const pronto = new Promise<Buffer>((res) => doc.on('end', () => res(Buffer.concat(chunks))));
  const L = doc.page.margins.left;
  const W = doc.page.width - L - doc.page.margins.right;
  const p = d.painel;

  // Logo oficial (arquivo SVG da marca, sem redesenho).
  const svg = readFileSync(join(process.cwd(), 'public/marca/omv-horizontal-cor.svg'), 'utf8');
  SVGtoPDF(doc, svg, L, 40, { width: 170, preserveAspectRatio: 'xMinYMin meet' });
  doc.y = 100;

  doc.font('titulo').fontSize(20).fillColor(COR.roxo).text('Relatório de indicadores', L, 100);
  doc.font('texto').fontSize(10).fillColor(COR.suave).text(`${d.unidadeRotulo} · ${p.periodoRotulo} · Fonte: registros aprovados enviados por entidades da rede`);
  doc.moveDown(0.3);
  if (!p.restrito) {
    doc.font('forte').fontSize(9).fillColor('#A8327C').text('DADOS INTERNOS SEM SUPRESSÃO — NÃO DIVULGAR', { characterSpacing: 0.6 });
  } else {
    doc.font('forte').fontSize(9).fillColor(COR.suave).text('Valores com supressão estatística aplicada.');
  }
  doc.moveDown(0.8);

  const espaco = (h: number) => {
    if (doc.y + h > doc.page.height - doc.page.margins.bottom) doc.addPage();
  };

  // Indicador principal
  espaco(70);
  const y0 = doc.y;
  doc.roundedRect(L, y0, W, 58, 10).fill(COR.fundo);
  doc.fillColor(COR.suave).font('texto').fontSize(9).text(`${d.unidadeRotulo} — ${p.periodoRotulo}`, L + 14, y0 + 10);
  doc.fillColor(COR.roxo).font('titulo').fontSize(24).text(p.total.suprimido ? 'suprimido' : fmtNumero(p.total.valor ?? 0), L + 14, y0 + 24);
  if (p.comparacao && p.comparacao.variacaoPct !== null) {
    doc.fillColor(COR.suave).font('texto').fontSize(9).text(`Variação vs. ${p.comparacao.anteriorRotulo}: ${p.comparacao.variacaoPct > 0 ? '+' : ''}${p.comparacao.variacaoPct.toFixed(1).replace('.', ',')}%`, L + W / 2, y0 + 30, { width: W / 2 - 14 });
  }
  doc.y = y0 + 70;

  const barras = (titulo: string, dados: Celula[], cor: string) => {
    if (!dados.length) return;
    espaco(40 + Math.min(dados.length, 6) * 20);
    doc.font('forte').fontSize(12).fillColor(COR.texto).text(titulo, L, doc.y);
    doc.moveDown(0.3);
    const max = Math.max(1, ...dados.map((x) => x.valor ?? 0));
    const rotW = 190;
    const barW = W - rotW - 70;
    for (const c of dados) {
      espaco(20);
      const y = doc.y;
      doc.font('texto').fontSize(9).fillColor(COR.texto).text(c.rotulo, L, y + 3, { width: rotW - 8, lineBreak: false, ellipsis: true });
      if (c.suprimido) {
        doc.rect(L + rotW, y + 2, barW, 11).dash(2, { space: 2 }).strokeColor(COR.viz4).stroke().undash();
        doc.fillColor(COR.suave).text('suprimido', L + rotW + barW + 6, y + 3);
      } else {
        const w = Math.max(1, ((c.valor ?? 0) / max) * barW);
        doc.rect(L + rotW, y + 2, w, 11).fill(cor);
        doc.fillColor(COR.texto).text(fmtNumero(c.valor ?? 0), L + rotW + w + 6, y + 3);
      }
      doc.y = y + 18;
    }
    doc.moveDown(0.8);
  };

  // Série mensal (barras verticais)
  if (p.serie.length) {
    espaco(190);
    doc.font('forte').fontSize(12).fillColor(COR.texto).text('Série mensal', L, doc.y);
    const base = doc.y + 130;
    const topo = doc.y + 10;
    const max = Math.max(1, ...p.serie.map((s) => s.valor ?? 0));
    const largura = W / p.serie.length;
    p.serie.forEach((s, i) => {
      const h = s.suprimido ? 0 : ((s.valor ?? 0) / max) * (base - topo - 14);
      doc.rect(L + i * largura + 4, base - h, Math.max(4, largura - 8), h).fill(COR.roxo);
      doc.fillColor(COR.suave).font('texto').fontSize(7).text(s.rotulo, L + i * largura, base + 4, { width: largura, align: 'center', lineBreak: false });
      if (!s.suprimido) doc.fillColor(COR.texto).fontSize(7).text(fmtNumero(s.valor ?? 0), L + i * largura, base - h - 10, { width: largura, align: 'center', lineBreak: false });
    });
    doc.y = base + 24;
  }
  barras('Por categoria de violência', p.porCategoria, COR.rosa);
  barras('Por faixa etária', p.porFaixa, COR.lilas);
  barras('Por tipo de registro', p.porTipo, COR.viz4);
  barras('Por região', p.porTerritorio.filter((t) => t.tipo === 'regiao'), COR.roxo);
  barras('Por território (bairros)', p.porTerritorio.filter((t) => t.tipo === 'bairro').sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1)).slice(0, 20), COR.rosa);

  espaco(100);
  doc.font('forte').fontSize(10).fillColor(COR.texto).text('Notas metodológicas', L, doc.y);
  doc.font('texto').fontSize(8.5).fillColor(COR.suave);
  for (const n of [...p.notas, 'Parâmetros de supressão são PROVISÓRIOS até validação institucional.', p.comparacao?.alerta].filter(Boolean) as string[]) doc.text(`• ${n}`, { width: W });

  // Rodapé em todas as páginas
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0; // evita página extra ao escrever dentro da margem inferior
    doc.font('texto').fontSize(8).fillColor(COR.suave).text(`OMV — Observatório Municipal de Violência de Ubatuba · gerado em ${fmtDataHora(d.geradoEm)} · página ${i + 1} de ${range.count}`, L, doc.page.height - 44, { width: W, align: 'center', lineBreak: false });
  }
  doc.end();
  return pronto;
}
