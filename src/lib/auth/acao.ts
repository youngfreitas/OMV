import 'server-only';
import { ErroAcesso, ErroNegocio } from './erros';

export type Resultado<T = unknown> = ({ ok: true } & T) | { ok: false; erro: string };

/** Envolve o corpo de uma server action convertendo erros esperados em mensagens para a UI. */
export async function acao<T extends object>(fn: () => Promise<T | void>): Promise<Resultado<T>> {
  try {
    const r = (await fn()) ?? ({} as T);
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof ErroAcesso || e instanceof ErroNegocio) return { ok: false, erro: e.message };
    // Redirecionamentos do Next são lançados como erros e devem seguir adiante.
    if (e && typeof e === 'object' && 'digest' in e && String((e as { digest: unknown }).digest).startsWith('NEXT_')) throw e;
    console.error('Falha em ação', e);
    return { ok: false, erro: 'Não foi possível concluir a operação. Tente novamente.' };
  }
}
