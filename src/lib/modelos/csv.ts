import { CHAVES_LINHA } from '../dicionario/campos';
import { IDENTIFICACAO } from './comum';

/** CSV com BOM UTF-8, separador ';' (padrão do Excel em pt-BR). A 1ª linha identifica o modelo. */
export function gerarCsv(): Buffer {
  const linhas = [`#omv-modelo;${IDENTIFICACAO.id};${IDENTIFICACAO.versao}`, CHAVES_LINHA.join(';')];
  return Buffer.from('﻿' + linhas.join('\r\n') + '\r\n', 'utf8');
}
