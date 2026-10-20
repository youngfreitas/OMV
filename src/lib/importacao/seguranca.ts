import { ErroImportacao, type FormatoImportacao } from './tipos';

export const LIMITE_BYTES = 5 * 1024 * 1024;
const LIMITE_ENTRADAS = 500;
const LIMITE_ENTRADA_DESCOMPRIMIDA = 50 * 1024 * 1024;
const LIMITE_TOTAL_DESCOMPRIMIDO = 100 * 1024 * 1024;
const RAZAO_MAXIMA = 100;

const EXTENSOES: Record<string, FormatoImportacao> = { csv: 'csv', xlsx: 'xlsx', docx: 'docx', md: 'md' };

const MIMES: Record<FormatoImportacao, string[]> = {
  csv: ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain', ''],
  md: ['text/markdown', 'text/x-markdown', 'text/plain', ''],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream', ''],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream', ''],
};

const ASSINATURAS_PROIBIDAS: Array<[string, number[]]> = [
  ['executável Windows', [0x4d, 0x5a]],
  ['executável Linux', [0x7f, 0x45, 0x4c, 0x46]],
  ['PDF', [0x25, 0x50, 0x44, 0x46]],
  ['documento OLE legado (macros possíveis)', [0xd0, 0xcf, 0x11, 0xe0]],
  ['arquivo RAR', [0x52, 0x61, 0x72, 0x21]],
  ['arquivo 7z', [0x37, 0x7a, 0xbc, 0xaf]],
  ['arquivo GZIP', [0x1f, 0x8b]],
  ['imagem PNG', [0x89, 0x50, 0x4e, 0x47]],
  ['imagem JPEG', [0xff, 0xd8, 0xff]],
];

const comeca = (b: Buffer, sig: number[], off = 0) => sig.every((v, i) => b[off + i] === v);

export function nomeSeguro(nome: string): string {
  const base = nome.split(/[\\/]/).pop() ?? 'arquivo';
  return base.replace(/[^\w.\- ()À-ÿ]/g, '_').slice(0, 120) || 'arquivo';
}

export function formatoPorExtensao(nome: string): FormatoImportacao {
  const ext = nome.toLowerCase().split('.').pop() ?? '';
  const f = EXTENSOES[ext];
  if (!f || !nome.includes('.')) {
    throw new ErroImportacao('Extensão não aceita. Envie um arquivo .csv, .xlsx, .docx ou .md baseado no modelo.', 'extensao');
  }
  return f;
}

type EntradaZip = { nome: string; comprimido: number; descomprimido: number; cifrada: boolean };

/** Lê o diretório central do ZIP SEM descomprimir nada (defesa contra zip-bomb). */
export function listarZip(b: Buffer): EntradaZip[] {
  const min = Math.max(0, b.length - 65557);
  let eocd = -1;
  for (let i = b.length - 22; i >= min; i--) {
    if (b.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ErroImportacao('Arquivo ZIP/OOXML corrompido.', 'zip_corrompido');
  const total = b.readUInt16LE(eocd + 10);
  let off = b.readUInt32LE(eocd + 16);
  if (total === 0xffff || off === 0xffffffff) throw new ErroImportacao('ZIP64 não é aceito.', 'zip64');
  if (total > LIMITE_ENTRADAS) throw new ErroImportacao('Arquivo com entradas demais.', 'zip_bomb');
  const entradas: EntradaZip[] = [];
  for (let i = 0; i < total; i++) {
    if (off + 46 > b.length || b.readUInt32LE(off) !== 0x02014b50) throw new ErroImportacao('Arquivo ZIP/OOXML corrompido.', 'zip_corrompido');
    const flags = b.readUInt16LE(off + 8);
    const comp = b.readUInt32LE(off + 20);
    const desc = b.readUInt32LE(off + 24);
    const nLen = b.readUInt16LE(off + 28);
    const eLen = b.readUInt16LE(off + 30);
    const cLen = b.readUInt16LE(off + 32);
    const nome = b.toString('utf8', off + 46, off + 46 + nLen);
    if (comp === 0xffffffff || desc === 0xffffffff) throw new ErroImportacao('ZIP64 não é aceito.', 'zip64');
    entradas.push({ nome, comprimido: comp, descomprimido: desc, cifrada: (flags & 1) === 1 });
    off += 46 + nLen + eLen + cLen;
  }
  return entradas;
}

const NOMES_PROIBIDOS =
  /vbaProject\.bin|(^|\/)embeddings\/|activeX|oleObject|externalLinks\/|macrosheets\/|dialogsheets\/|\.(exe|dll|bat|cmd|ps1|vbs|js|jar|sh|scr|com)$|\.bin$/i;

export function verificarZip(b: Buffer, formato: 'xlsx' | 'docx'): EntradaZip[] {
  const entradas = listarZip(b);
  let total = 0;
  for (const e of entradas) {
    if (e.nome.includes('..') || e.nome.startsWith('/') || e.nome.includes('\\')) {
      throw new ErroImportacao('O arquivo contém caminhos inválidos.', 'zip_caminho');
    }
    if (e.cifrada) throw new ErroImportacao('Arquivos protegidos por senha não são aceitos.', 'zip_cifrado');
    if (e.descomprimido > LIMITE_ENTRADA_DESCOMPRIMIDA) throw new ErroImportacao('Conteúdo descomprimido grande demais (possível zip-bomb).', 'zip_bomb');
    if (e.comprimido > 0 && e.descomprimido > 1024 * 1024 && e.descomprimido / e.comprimido > RAZAO_MAXIMA) {
      throw new ErroImportacao('Razão de compressão suspeita (possível zip-bomb).', 'zip_bomb');
    }
    total += e.descomprimido;
    if (NOMES_PROIBIDOS.test(e.nome)) {
      throw new ErroImportacao('O arquivo contém macros, objetos incorporados ou vínculos externos, que não são aceitos.', 'macro_ou_objeto');
    }
  }
  if (total > LIMITE_TOTAL_DESCOMPRIMIDO) throw new ErroImportacao('Conteúdo descomprimido grande demais (possível zip-bomb).', 'zip_bomb');
  const nomes = new Set(entradas.map((e) => e.nome));
  const principal = formato === 'xlsx' ? 'xl/workbook.xml' : 'word/document.xml';
  if (!nomes.has('[Content_Types].xml') || !nomes.has(principal)) {
    throw new ErroImportacao(`O arquivo não é um .${formato} válido.`, 'estrutura');
  }
  return entradas;
}

export type ArquivoVerificado = { formato: FormatoImportacao; nome: string; texto?: string };

/**
 * Verificação de segurança ANTES de qualquer leitura de conteúdo:
 * extensão, MIME declarado, tamanho, assinatura, estrutura ZIP (zip-bomb/macros) e codificação de texto.
 */
export function verificarArquivo(nomeOriginal: string, buffer: Buffer, mimeDeclarado = ''): ArquivoVerificado {
  const nome = nomeSeguro(nomeOriginal);
  const formato = formatoPorExtensao(nome);
  if (buffer.length === 0) throw new ErroImportacao('O arquivo está vazio.', 'vazio');
  if (buffer.length > LIMITE_BYTES) throw new ErroImportacao('Arquivo maior que o limite de 5 MB.', 'tamanho');
  const mime = mimeDeclarado.split(';')[0]!.trim().toLowerCase();
  if (!MIMES[formato].includes(mime)) {
    throw new ErroImportacao('O tipo do arquivo não corresponde à extensão.', 'mime');
  }
  for (const [desc, sig] of ASSINATURAS_PROIBIDAS) {
    if (comeca(buffer, sig) && !(sig[0] === 0x50 && sig[1] === 0x4b)) {
      throw new ErroImportacao(`O conteúdo do arquivo é ${desc}, não ${formato.toUpperCase()}.`, 'assinatura');
    }
  }
  if (formato === 'xlsx' || formato === 'docx') {
    if (!comeca(buffer, [0x50, 0x4b, 0x03, 0x04])) {
      throw new ErroImportacao(`O conteúdo do arquivo não é um .${formato} válido (assinatura incorreta).`, 'assinatura');
    }
    verificarZip(buffer, formato);
    return { formato, nome };
  }
  if (comeca(buffer, [0x50, 0x4b])) throw new ErroImportacao('O conteúdo é um arquivo compactado, não texto.', 'assinatura');
  if (buffer.subarray(0, 8192).includes(0)) throw new ErroImportacao('O arquivo contém dados binários.', 'binario');
  let texto: string;
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    texto = new TextDecoder('windows-1252').decode(buffer); // CSV do Excel em pt-BR
  }
  return { formato, nome, texto: texto.replace(/^﻿/, '') };
}
