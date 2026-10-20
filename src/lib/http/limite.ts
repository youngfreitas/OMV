/** Limitador simples em memória (janela fixa) para rotas públicas. Em produção, complementar no proxy reverso. */
const baldes = new Map<string, { inicio: number; n: number }>();

export function dentroDoLimite(chave: string, max = 120, janelaMs = 60_000): boolean {
  const agora = Date.now();
  const b = baldes.get(chave);
  if (!b || agora - b.inicio > janelaMs) {
    baldes.set(chave, { inicio: agora, n: 1 });
    if (baldes.size > 5000) for (const [k, v] of baldes) if (agora - v.inicio > janelaMs) baldes.delete(k);
    return true;
  }
  b.n++;
  return b.n <= max;
}
