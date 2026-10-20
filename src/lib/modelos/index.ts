import { gerarCsv } from './csv';
import { gerarDocx } from './docx';
import { gerarMd } from './md';
import { gerarXlsx } from './xlsx';
import type { FormatoModelo, ListasModelo } from './comum';

export * from './comum';

export async function gerarModelo(formato: FormatoModelo, listas: ListasModelo): Promise<Buffer> {
  switch (formato) {
    case 'csv':
      return gerarCsv();
    case 'md':
      return gerarMd(listas);
    case 'xlsx':
      return gerarXlsx(listas);
    case 'docx':
      return gerarDocx(listas);
  }
}
