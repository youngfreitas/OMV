import type { LinhaBruta } from '../dicionario/campos';
import type { Achado } from '../validacao/tipos';

export type FormatoImportacao = 'csv' | 'xlsx' | 'docx' | 'md';

export type ControleModelo = { idModelo?: string; versao?: string };

export type ResultadoLeitura = {
  formato: FormatoImportacao;
  controle: ControleModelo | null;
  linhas: LinhaBruta[];
  achados: Achado[];
};

export class ErroImportacao extends Error {
  constructor(
    mensagem: string,
    public codigo: string,
  ) {
    super(mensagem);
    this.name = 'ErroImportacao';
  }
}
