/**
 * Domínios padrão (classificações). São a semente do cadastro `classificacoes` e o
 * fallback quando o banco não está disponível. Todos PROVISÓRIOS até validação da Secretaria.
 */
export type ItemDominio = {
  codigo: string;
  rotulo: string;
  definicao?: string;
  /** Apenas tipo_registro: unidades de contagem permitidas. */
  unidadesPermitidas?: string[];
};

export const DOMINIOS_PADRAO = {
  categoria_violencia: [
    { codigo: 'fisica', rotulo: 'Violência física' },
    { codigo: 'psicologica', rotulo: 'Violência psicológica' },
    { codigo: 'sexual', rotulo: 'Violência sexual' },
    { codigo: 'patrimonial', rotulo: 'Violência patrimonial' },
    { codigo: 'moral', rotulo: 'Violência moral' },
    { codigo: 'descumprimento_medida', rotulo: 'Descumprimento de medida protetiva' },
    { codigo: 'nao_especificada', rotulo: 'Não especificada' },
  ],
  tipo_registro: [
    {
      codigo: 'ocorrencia_policial',
      rotulo: 'Ocorrência policial',
      unidadesPermitidas: ['registro'],
    },
    {
      codigo: 'atendimento_servico',
      rotulo: 'Atendimento em serviço da rede',
      unidadesPermitidas: ['atendimento', 'pessoa_unica'],
    },
    { codigo: 'denuncia_canal', rotulo: 'Denúncia em canal de atendimento', unidadesPermitidas: ['registro'] },
    { codigo: 'medida_protetiva', rotulo: 'Medida protetiva', unidadesPermitidas: ['registro'] },
    {
      codigo: 'encaminhamento',
      rotulo: 'Encaminhamento',
      unidadesPermitidas: ['registro', 'atendimento'],
    },
  ],
  faixa_etaria: [
    { codigo: 'ate_17', rotulo: 'Até 17 anos' },
    { codigo: '18_24', rotulo: '18 a 24 anos' },
    { codigo: '25_34', rotulo: '25 a 34 anos' },
    { codigo: '35_44', rotulo: '35 a 44 anos' },
    { codigo: '45_59', rotulo: '45 a 59 anos' },
    { codigo: '60_mais', rotulo: '60 anos ou mais' },
    { codigo: 'nao_informada', rotulo: 'Não informada' },
  ],
  tipo_atendimento: [
    { codigo: 'acolhimento', rotulo: 'Acolhimento' },
    { codigo: 'orientacao_juridica', rotulo: 'Orientação jurídica' },
    { codigo: 'psicossocial', rotulo: 'Atendimento psicossocial' },
    { codigo: 'saude', rotulo: 'Atendimento em saúde' },
    { codigo: 'abrigamento', rotulo: 'Abrigamento' },
    { codigo: 'outro', rotulo: 'Outro' },
  ],
  canal_entrada: [
    { codigo: 'demanda_espontanea', rotulo: 'Demanda espontânea' },
    { codigo: 'encaminhamento_rede', rotulo: 'Encaminhamento da rede' },
    { codigo: 'denuncia_180', rotulo: 'Central de atendimento 180' },
    { codigo: 'delegacia', rotulo: 'Delegacia' },
    { codigo: 'outro', rotulo: 'Outro' },
  ],
  relacao_autor: [
    { codigo: 'companheiro', rotulo: 'Companheiro(a) atual' },
    { codigo: 'ex_companheiro', rotulo: 'Ex-companheiro(a)' },
    { codigo: 'familiar', rotulo: 'Familiar' },
    { codigo: 'outro', rotulo: 'Outro vínculo' },
    { codigo: 'nao_informada', rotulo: 'Não informada' },
  ],
  situacao_atendimento: [
    { codigo: 'em_acompanhamento', rotulo: 'Em acompanhamento' },
    { codigo: 'encerrado', rotulo: 'Encerrado' },
    { codigo: 'encaminhado', rotulo: 'Encaminhado a outro serviço' },
  ],
  unidade_contagem: [
    { codigo: 'registro', rotulo: 'Registros', definicao: 'Número de registros (ocorrências) no período.' },
    { codigo: 'atendimento', rotulo: 'Atendimentos', definicao: 'Número de atendimentos realizados no período.' },
    {
      codigo: 'pessoa_unica',
      rotulo: 'Pessoas atendidas (únicas)',
      definicao: 'Pessoas distintas atendidas no período, sem identificá-las.',
    },
  ],
} satisfies Record<string, ItemDominio[]>;

export type NomeDominio = keyof typeof DOMINIOS_PADRAO;
export const NOMES_DOMINIOS = Object.keys(DOMINIOS_PADRAO) as NomeDominio[];

export const ROTULOS_DOMINIO: Record<NomeDominio, string> = {
  categoria_violencia: 'Categoria de violência',
  tipo_registro: 'Tipo de registro',
  faixa_etaria: 'Faixa etária',
  tipo_atendimento: 'Tipo de atendimento',
  canal_entrada: 'Canal de entrada',
  relacao_autor: 'Vínculo com o autor',
  situacao_atendimento: 'Situação do atendimento',
  unidade_contagem: 'Unidade de contagem',
};

/** Domínios carregados (do banco ou do padrão): código → item. */
export type Dominios = Record<string, ItemDominio[]>;

export function dominiosPadrao(): Dominios {
  return Object.fromEntries(
    Object.entries(DOMINIOS_PADRAO).map(([k, v]) => [k, v.map((i) => ({ ...i }))]),
  );
}
