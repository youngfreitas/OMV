import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { CAMPOS_LINHA } from '../dicionario/campos';
import { COLUNAS, DECLARACAO_SEM_DADOS_PESSOAIS, IDENTIFICACAO, TEXTO_INSTRUCOES, listaDominio, rotuloDominio, type ListasModelo } from './comum';

const celula = (t: string, negrito = false) =>
  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t, bold: negrito, size: 16 })] })] });

export async function gerarDocx(listas: ListasModelo): Promise<Buffer> {
  const doms = [...new Set(CAMPOS_LINHA.flatMap((c) => (c.dominio ? [c.dominio] : [])))];
  const tabelaDados = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: COLUNAS.map((c) => celula(c.rotulo, true)) }),
      ...Array.from({ length: 5 }, () => new TableRow({ children: COLUNAS.map(() => celula(' ')) })),
    ],
  });
  const tabelaCampos = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: ['Campo', 'Obrigatório', 'Ajuda', 'Exemplo'].map((t) => celula(t, true)) }),
      ...CAMPOS_LINHA.map(
        (c) => new TableRow({ children: [c.rotulo, c.obrigatorio ? 'sim' : c.condicional ? 'condicional' : 'não', c.ajuda, c.exemplo].map((t) => celula(t)) }),
      ),
    ],
  });
  const doc = new Document({
    creator: 'OMV Ubatuba',
    title: `Modelo ${IDENTIFICACAO.id} ${IDENTIFICACAO.versao}`,
    sections: [
      {
        children: [
          new Paragraph({ text: 'OMV — Modelo de envio', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [new TextRun({ text: `Controle do modelo: ${IDENTIFICACAO.id} versão ${IDENTIFICACAO.versao}`, bold: true })] }),
          new Paragraph({ text: 'Instruções', heading: HeadingLevel.HEADING_2 }),
          ...TEXTO_INSTRUCOES.map((t) => new Paragraph({ text: t, bullet: { level: 0 } })),
          new Paragraph({ children: [new TextRun({ text: DECLARACAO_SEM_DADOS_PESSOAIS, italics: true })] }),
          new Paragraph({ text: 'Dados', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: 'Preencha a tabela abaixo (uma linha por combinação). Não adicione outras tabelas antes desta.' }),
          tabelaDados,
          new Paragraph({ text: 'Campos', heading: HeadingLevel.HEADING_2 }),
          tabelaCampos,
          new Paragraph({ text: 'Listas permitidas', heading: HeadingLevel.HEADING_2 }),
          ...doms.flatMap((d) => [
            new Paragraph({ text: rotuloDominio(d), heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: listaDominio(listas, d).join(' · ') }),
          ]),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
