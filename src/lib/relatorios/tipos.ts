import type { PainelDados } from '@/server/dados';

export type DadosRelatorio = {
  painel: PainelDados;
  unidadeRotulo: string;
  geradoEm: Date;
  geradoPor: string;
};
