import { describe, expect, it } from 'vitest';
import { dominiosPadrao } from '@/lib/dicionario/dominios';
import { detectarPii } from '@/lib/validacao/pii';
import { validarEnvio } from '@/lib/validacao/regras';
import { normalizarData, normalizarInteiro } from '@/lib/validacao/normalizar';

const ctx = {
  dominios: dominiosPadrao(),
  bairros: [
    { codigo: 'b1', nome: 'Centro', ativo: true },
    { codigo: 'b2', nome: 'Praia Grande', ativo: true },
  ],
  hoje: new Date('2026-10-20T12:00:00Z'),
  entidadeId: 'e1',
};

const boa = {
  periodo_inicio: '01/03/2026',
  periodo_fim: '31/03/2026',
  bairro: 'Centro',
  tipo_registro: 'atendimento_servico',
  unidade_contagem: 'atendimento',
  categoria_violencia: 'Violência psicológica',
  faixa_etaria: '25_34',
  tipo_atendimento: 'acolhimento',
  quantidade: '12',
};

describe('normalização', () => {
  it('datas', () => {
    expect(normalizarData('31/03/2026')).toBe('2026-03-31');
    expect(normalizarData('2026-03-31T10:00:00Z')).toBe('2026-03-31');
    expect(normalizarData('31/02/2026')).toBeNull();
    expect(normalizarData('ontem')).toBeNull();
  });
  it('inteiros', () => {
    expect(normalizarInteiro('12').valor).toBe(12);
    expect(normalizarInteiro('1.234').valor).toBe(1234);
    expect(normalizarInteiro('12,0').valor).toBe(12);
    expect(normalizarInteiro('12,5').motivo).toBe('nao_inteiro');
    expect(normalizarInteiro('-3').motivo).toBe('negativo');
    expect(normalizarInteiro('').motivo).toBe('vazio');
  });
});

describe('detecção de dado pessoal', () => {
  it('detecta tipos estruturados', () => {
    expect(detectarPii('CPF 529.982.247-25')).toContain('cpf');
    expect(detectarPii('52998224725')).toContain('cpf');
    expect(detectarPii('(12) 99876-5432')).toContain('telefone');
    expect(detectarPii('contato maria@exemplo.com')).toContain('email');
    expect(detectarPii('CEP 11680-000')).toContain('cep');
    expect(detectarPii('Rua das Flores, 120')).toContain('logradouro');
    expect(detectarPii('-23.43360, -45.08380')).toContain('coordenada');
    expect(detectarPii('nascida em 12/05/1990')).toContain('data_nascimento');
    expect(detectarPii('RG 12.345.678-9')).toContain('rg');
  });
  it('não gera falso positivo em dados agregados comuns', () => {
    expect(detectarPii('12')).toEqual([]);
    expect(detectarPii('01/03/2026')).toEqual([]);
    expect(detectarPii('Praia Grande')).toEqual([]);
    expect(detectarPii('Violência psicológica')).toEqual([]);
    expect(detectarPii('Dados consolidados do mês, incluindo plantão.', true)).toEqual([]);
  });
  it('nomes próprios só em texto livre', () => {
    expect(detectarPii('atendimento de Maria da Silva', true)).toContain('nome_proprio');
    expect(detectarPii('Maria da Silva', false)).not.toContain('nome_proprio');
  });
  it('detecta CPF e nunca devolve o trecho', () => {
    const r = detectarPii('529.982.247-25');
    expect(JSON.stringify(r)).not.toContain('529');
  });
});

describe('validarEnvio', () => {
  it('aceita linha válida e normaliza para códigos', () => {
    const { linhas, relatorio } = validarEnvio({ linhas: [boa] }, ctx);
    expect(relatorio.resumo.erros).toBe(0);
    expect(linhas[0]).toMatchObject({ bairro: 'b1', categoria_violencia: 'psicologica', quantidade: 12 });
    expect(relatorio.resumo.quantidadePorUnidade).toEqual({ atendimento: 12 });
  });
  it('rejeita obrigatórios, domínio, bairro, quantidade e período', () => {
    const { relatorio } = validarEnvio(
      {
        linhas: [
          { ...boa, bairro: 'Inexistente' },
          { ...boa, categoria_violencia: 'xyz' },
          { ...boa, quantidade: '-1' },
          { ...boa, quantidade: '1,5' },
          { ...boa, periodo_fim: '15/04/2026' },
          { ...boa, periodo_fim: '01/02/2026' },
          { ...boa, periodo_inicio: '01/12/2026', periodo_fim: '31/12/2026' },
          { ...boa, faixa_etaria: '' },
        ],
      },
      ctx,
    );
    const codigos = relatorio.achados.filter((a) => a.nivel === 'erro').map((a) => a.codigo);
    expect(codigos).toEqual(
      expect.arrayContaining(['bairro_inexistente', 'dominio_invalido', 'quantidade_negativa', 'quantidade_invalida', 'periodo_varios_meses', 'periodo_invertido', 'periodo_futuro', 'obrigatorio']),
    );
  });
  it('unidade incompatível com tipo de registro', () => {
    const { relatorio } = validarEnvio({ linhas: [{ ...boa, tipo_registro: 'ocorrencia_policial', unidade_contagem: 'pessoa_unica' }] }, ctx);
    expect(relatorio.achados.map((a) => a.codigo)).toContain('unidade_incompativel');
  });
  it('tipo de atendimento é obrigatório para atendimento de serviço', () => {
    const { relatorio } = validarEnvio({ linhas: [{ ...boa, tipo_atendimento: '' }] }, ctx);
    expect(relatorio.achados.some((a) => a.codigo === 'obrigatorio' && a.campo === 'tipo_atendimento')).toBe(true);
  });
  it('duplicidade interna e entre envios', () => {
    const a = validarEnvio({ linhas: [boa, { ...boa, quantidade: '3' }] }, ctx);
    expect(a.relatorio.achados.map((x) => x.codigo)).toContain('duplicidade_interna');
  });
  it('marca como restrito sem reproduzir o conteúdo', () => {
    const { relatorio } = validarEnvio({ linhas: [{ ...boa, observacao: 'Ligar para (12) 99876-5432' }] }, ctx);
    expect(relatorio.restrita).toBe(true);
    expect(JSON.stringify(relatorio)).not.toContain('99876');
  });
  it('variação brusca contra o histórico', () => {
    const { relatorio } = validarEnvio({ linhas: [boa] }, { ...ctx, mediasHistoricas: { atendimento: 100 }, variacaoPct: 60 });
    expect(relatorio.achados.map((a) => a.codigo)).toContain('variacao_brusca');
  });
  it('envio vazio é erro', () => {
    const { relatorio } = validarEnvio({ linhas: [{}] }, ctx);
    expect(relatorio.achados[0]?.codigo).toBe('sem_linhas');
  });
});
