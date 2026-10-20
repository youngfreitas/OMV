import type { Root, RootContent, Table } from 'mdast';
import { toString } from 'mdast-util-to-string';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { tabelaParaLinhas } from './cabecalhos';
import { ErroImportacao, type ResultadoLeitura } from './tipos';

function tabelas(nos: RootContent[], out: Table[] = []): Table[] {
  for (const n of nos) {
    if (n.type === 'table') out.push(n);
    else if ('children' in n) tabelas(n.children as RootContent[], out);
  }
  return out;
}

export function lerMd(texto: string): ResultadoLeitura {
  const m = /<!--\s*omv-modelo:\s*(\S+)\s+([\d.]+)\s*-->/i.exec(texto);
  const controle = m ? { idModelo: m[1], versao: m[2] } : null;
  const arvore = unified().use(remarkParse).use(remarkGfm).parse(texto) as Root;
  for (const tb of tabelas(arvore.children)) {
    const matriz = tb.children.map((linha) => linha.children.map((c) => toString(c).trim()));
    const t = tabelaParaLinhas(matriz);
    if (t) return { formato: 'md', controle, linhas: t.linhas, achados: t.achados };
  }
  throw new ErroImportacao('Não encontramos a tabela de dados do modelo no arquivo Markdown.', 'sem_tabela');
}
