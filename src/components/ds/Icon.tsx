import { cx } from './util';

/* Ícones de linha, grade 24px, traço 2px, pontas arredondadas (portado do design system OMV).
   p = path, c = círculo [cx, cy, r], r = retângulo [x, y, w, h, rx] */
type Forma =
  | ['p', string]
  | ['c', number, number, number]
  | ['r', number, number, number, number, number];

const ICONES: Record<string, Forma[]> = {
  inicio: [['p', 'M3 10.5 12 3l9 7.5'], ['p', 'M5 9v11h5v-6h4v6h5V9']],
  indicadores: [['r', 4.5, 11, 3.5, 9, 1], ['r', 10.25, 4, 3.5, 16, 1], ['r', 16, 8, 3.5, 12, 1]],
  relatorios: [['p', 'M6 3h8l4 4v14H6z'], ['p', 'M14 3v4h4'], ['p', 'M9 12h6'], ['p', 'M9 16h6']],
  notificacoes: [['p', 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z'], ['p', 'M10 20.5a2 2 0 0 0 4 0']],
  usuario: [['c', 12, 8, 4], ['p', 'M4 21a8 8 0 0 1 16 0']],
  pessoas: [['c', 9, 8, 3.5], ['p', 'M2.5 20a6.5 6.5 0 0 1 13 0'], ['p', 'M16 4.5a3.5 3.5 0 0 1 0 7'], ['p', 'M18 14.2a6.5 6.5 0 0 1 3.5 5.8']],
  buscar: [['c', 11, 11, 7], ['p', 'M20 20l-4-4']],
  'seta-direita': [['p', 'M9 6l6 6-6 6']],
  'seta-baixo': [['p', 'M6 9l6 6 6-6']],
  'seta-esquerda': [['p', 'M15 6l-6 6 6 6']],
  ocorrencias: [['r', 5, 4, 14, 17, 2], ['p', 'M9 2.5h6v3H9z'], ['p', 'M9 13l2 2 4-4']],
  'em-analise': [['p', 'M4 5h16v11H10l-5 4v-4H4z'], ['c', 11.5, 10, 2.5], ['p', 'M13.5 12l2 2']],
  local: [['p', 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z'], ['c', 12, 9.5, 2.5]],
  mapa: [['p', 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z'], ['p', 'M9 3v15'], ['p', 'M15 6v15']],
  mais: [['p', 'M12 5v14'], ['p', 'M5 12h14']],
  confirmar: [['p', 'M5 12.5l4.5 4.5L19 7.5']],
  fechar: [['p', 'M6 6l12 12'], ['p', 'M18 6 6 18']],
  filtrar: [['p', 'M4 5h16l-6 7.5V19l-4 2v-8.5z']],
  baixar: [['p', 'M12 4v11'], ['p', 'M7 10l5 5 5-5'], ['p', 'M5 20h14']],
  imprimir: [['p', 'M7 9V3h10v6'], ['r', 3, 9, 18, 8, 2], ['p', 'M7 14h10v7H7z']],
  orgao: [['p', 'M4 21V5l8-2v18'], ['p', 'M12 9l8 2v10'], ['p', 'M2 21h20'], ['p', 'M7 8h2M7 12h2M7 16h2M15 14h2M15 17.5h2']],
  enviar: [['p', 'M21 3 10 14'], ['p', 'M21 3l-7 18-4-7-7-4z']],
  arquivar: [['r', 3, 4, 18, 4, 1], ['p', 'M5 8v12h14V8'], ['p', 'M10 12h4']],
  ver: [['p', 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z'], ['c', 12, 12, 3]],
  alerta: [['p', 'M12 3.5 2.5 20h19z'], ['p', 'M12 10v4'], ['p', 'M12 17.2v.3']],
  editar: [['p', 'M4 20h4L19 9l-4-4L4 16z'], ['p', 'M13 7l4 4']],
  calendario: [['r', 3, 5, 18, 16, 2], ['p', 'M3 10h18'], ['p', 'M8 3v4M16 3v4']],
  publicar: [['c', 12, 12, 9], ['p', 'M3 12h18'], ['p', 'M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18']],
  sair: [['p', 'M15 4h4v16h-4'], ['p', 'M10 8l-4 4 4 4'], ['p', 'M6 12h10']],
  ajustes: [['p', 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12'], ['c', 16, 6, 2], ['c', 10, 12, 2], ['c', 18, 18, 2]],
  menu: [['p', 'M4 6h16M4 12h16M4 18h16']],
  subiu: [['p', 'M12 19V5'], ['p', 'M6 11l6-6 6 6']],
  desceu: [['p', 'M12 5v14'], ['p', 'M6 13l6 6 6-6']],
  // Complementos (mesmo estilo de traço) para as telas do sistema
  subir: [['p', 'M12 20V9'], ['p', 'M7 14l5-5 5 5'], ['p', 'M5 4h14']],
  arquivo: [['p', 'M6 3h8l4 4v14H6z'], ['p', 'M14 3v4h4']],
  escudo: [['p', 'M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z'], ['p', 'M9 12l2 2 4-4']],
  lixeira: [['p', 'M4 7h16'], ['p', 'M9 7V4h6v3'], ['p', 'M6 7l1 13h10l1-13']],
  info: [['c', 12, 12, 9], ['p', 'M12 11v6'], ['p', 'M12 7.5v.3']],
  relogio: [['c', 12, 12, 9], ['p', 'M12 7v5l3 2']],
  cadeado: [['r', 5, 11, 14, 10, 2], ['p', 'M8 11V8a4 4 0 0 1 8 0v3']],
  comentario: [['p', 'M4 5h16v11H9l-5 4z']],
  historico: [['p', 'M4 12a8 8 0 1 0 2.5-5.8'], ['p', 'M4 4v4h4'], ['p', 'M12 8v4l3 2']],
  tabela: [['r', 3, 4, 18, 16, 2], ['p', 'M3 10h18'], ['p', 'M3 15h18'], ['p', 'M9 4v16']],
  'mais-opcoes': [['c', 5, 12, 1], ['c', 12, 12, 1], ['c', 19, 12, 1]],
  tema: [['c', 12, 12, 4], ['p', 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4']],
};

export const NOMES_ICONES = Object.keys(ICONES);

export type NomeIcone = string;

export function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  label,
  className,
}: {
  name: NomeIcone;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}) {
  const formas = ICONES[name] ?? ICONES.alerta!;
  return (
    <svg
      className={cx('omv-icon', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {formas.map((f, i) =>
        f[0] === 'p' ? (
          <path key={i} d={f[1]} />
        ) : f[0] === 'c' ? (
          <circle key={i} cx={f[1]} cy={f[2]} r={f[3]} />
        ) : (
          <rect key={i} x={f[1]} y={f[2]} width={f[3]} height={f[4]} rx={f[5]} />
        ),
      )}
    </svg>
  );
}
