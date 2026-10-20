import { XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';
import { tabelaParaLinhas } from './cabecalhos';
import { ErroImportacao, type ResultadoLeitura } from './tipos';

const parser = new XMLParser({
  ignoreAttributes: true,
  processEntities: false,
  removeNSPrefix: true,
  isArray: (n) => ['tbl', 'tr', 'tc', 'p', 'r', 't'].includes(n),
});

type No = Record<string, unknown>;

function textoParagrafo(p: No): string {
  const rs = (p.r as No[] | undefined) ?? [];
  return rs.map((r) => ((r.t as unknown[] | undefined) ?? []).map((t) => (typeof t === 'object' && t ? String((t as No)['#text'] ?? '') : String(t))).join('')).join('');
}

function textoCelula(tc: No): string {
  return (((tc.p as No[] | undefined) ?? []).map(textoParagrafo).join(' ')).trim();
}

export async function lerDocx(buffer: Buffer): Promise<ResultadoLeitura> {
  const zip = await JSZip.loadAsync(buffer);
  // Relações externas (modelos remotos, vínculos) não são aceitas.
  for (const nome of Object.keys(zip.files)) {
    if (nome.endsWith('.rels')) {
      const rels = await zip.files[nome]!.async('string');
      for (const r of rels.matchAll(/<Relationship\b[^>]*>/gi)) {
        if (/TargetMode\s*=\s*"External"/i.test(r[0]) && !/\/hyperlink"/i.test(r[0])) {
          throw new ErroImportacao('O documento contém vínculos externos, que não são aceitos.', 'vinculo_externo');
        }
      }
    }
  }
  const arq = zip.files['word/document.xml'];
  if (!arq) throw new ErroImportacao('O arquivo não é um .docx válido.', 'estrutura');
  const xml = await arq.async('string');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new ErroImportacao('Documento com declaração XML não permitida.', 'xml_perigoso');
  if (/instrText[^>]*>[^<]*\b(DDE|DDEAUTO|INCLUDETEXT|INCLUDEPICTURE|LINK|IMPORT|MACROBUTTON)\b/i.test(xml)) {
    throw new ErroImportacao('O documento contém campos dinâmicos não aceitos.', 'campo_dinamico');
  }
  const doc = parser.parse(xml) as { document?: { body?: No } };
  const corpo = doc.document?.body ?? {};
  const tabelas = (corpo.tbl as No[] | undefined) ?? [];
  const paragrafos = ((corpo.p as No[] | undefined) ?? []).map(textoParagrafo);
  let controle: ResultadoLeitura['controle'] = null;
  for (const p of paragrafos) {
    const m = /Controle do modelo:\s*(\S+)\s+vers[aã]o\s+([\d.]+)/i.exec(p);
    if (m) controle = { idModelo: m[1], versao: m[2] };
  }
  for (const tbl of tabelas) {
    const matriz = ((tbl.tr as No[] | undefined) ?? []).map((tr) => ((tr.tc as No[] | undefined) ?? []).map(textoCelula));
    const t = tabelaParaLinhas(matriz);
    if (t) return { formato: 'docx', controle, linhas: t.linhas, achados: t.achados };
  }
  throw new ErroImportacao('Não encontramos a tabela de dados do modelo no documento.', 'sem_tabela');
}
