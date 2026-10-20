import type { LinhaNormalizada, ResumoValidacao } from './tipos';

const OPCIONAIS = ['tipo_atendimento', 'canal_entrada', 'relacao_autor', 'situacao_atendimento'] as const;

export function calcularQualidade(linhas: LinhaNormalizada[]): ResumoValidacao['qualidade'] {
  const validas = linhas.filter((l) => !l.invalida);
  if (!validas.length) return { completudeOpcionais: 0, naoInformada: 0 };
  let preenchidos = 0;
  let naoInf = 0;
  for (const l of validas) {
    for (const o of OPCIONAIS) if (l[o]) preenchidos++;
    if (l.faixa_etaria === 'nao_informada' || l.categoria_violencia === 'nao_especificada') naoInf++;
  }
  return {
    completudeOpcionais: preenchidos / (validas.length * OPCIONAIS.length),
    naoInformada: naoInf / validas.length,
  };
}
