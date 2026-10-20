import { createHash } from 'node:crypto';
import { conteudoCanonico } from './duplicidade';
import type { LinhaNormalizada } from './tipos';

/** Hash por entidade + período + linha (somente servidor). */
export function hashLinha(entidadeId: string, l: LinhaNormalizada): string {
  return createHash('sha256').update(conteudoCanonico(entidadeId, l)).digest('hex');
}
