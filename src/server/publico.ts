import 'server-only';
import { modoDemo } from '@/lib/demo/modo';
import { registrosDemo } from '@/lib/demo/dados';

export type ResumoPublico = {
  modo: 'demo' | 'real' | 'vazio';
  atualizadoEm: string | null;
  periodo: string | null;
  totais: Array<{ chave: string; rotulo: string; valor: number | null; nota: string }>;
};

/** Resumo exibido na landing. Etapa 6 substitui a leitura "real" por `indicadores_publicados`. */
export async function obterResumoPublico(): Promise<ResumoPublico> {
  if (modoDemo()) {
    const regs = registrosDemo();
    const total = regs.reduce((s, r) => s + r.quantidade, 0);
    return {
      modo: 'demo',
      atualizadoEm: '2026-10-01',
      periodo: 'Últimos 12 meses (dados fictícios)',
      totais: [
        { chave: 'atendimentos', rotulo: 'Atendimentos no período', valor: total, nota: 'Unidade: atendimentos' },
      ],
    };
  }
  return { modo: 'vazio', atualizadoEm: null, periodo: null, totais: [] };
}
