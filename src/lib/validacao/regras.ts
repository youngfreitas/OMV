import { CAMPOS_LINHA, type LinhaBruta } from '../dicionario/campos';
import { chaveDimensao } from './duplicidade';
import { chaveTexto, mesDe, normalizarData, normalizarInteiro } from './normalizar';
import { ROTULO_PII, detectarPii } from './pii';
import { calcularQualidade } from './qualidade';
import type {
  Achado,
  CelulaPii,
  ContextoValidacao,
  LinhaNormalizada,
  RelatorioValidacao,
} from './tipos';

export const MAX_LINHAS = 5000;

type Mapa = Map<string, string>;

function mapaDominio(itens: Array<{ codigo: string; rotulo: string }>): Mapa {
  const m: Mapa = new Map();
  for (const i of itens) {
    m.set(chaveTexto(i.codigo), i.codigo);
    m.set(chaveTexto(i.rotulo), i.codigo);
  }
  return m;
}

const vazia = (r: LinhaBruta) => Object.values(r).every((v) => (v ?? '').toString().trim() === '');

/**
 * Valida e normaliza um envio. Função PURA (sem acesso a banco): roda no navegador (tempo real) e no servidor.
 * Alertas descrevem o que foi encontrado; não acusam a entidade.
 */
export function validarEnvio(
  entrada: { cabecalho?: LinhaBruta; linhas: LinhaBruta[] },
  ctx: ContextoValidacao,
): { linhas: LinhaNormalizada[]; relatorio: RelatorioValidacao } {
  const achados: Achado[] = [];
  const celulasPii: CelulaPii[] = [];
  const add = (a: Achado) => achados.push(a);

  const dominios: Record<string, Mapa> = {};
  for (const [k, v] of Object.entries(ctx.dominios)) dominios[k] = mapaDominio(v);
  const mapaBairros = mapaDominio(ctx.bairros.filter((b) => b.ativo).map((b) => ({ codigo: b.codigo, rotulo: b.nome })));
  const tipoRegistro = new Map(ctx.dominios.tipo_registro?.map((t) => [t.codigo, t.unidadesPermitidas]) ?? []);

  const cab = entrada.cabecalho ?? {};
  const brutas = entrada.linhas.filter((r) => !vazia(r));

  if (brutas.length === 0) add({ nivel: 'erro', codigo: 'sem_linhas', mensagem: 'O envio não possui nenhuma linha preenchida.' });
  if (brutas.length > MAX_LINHAS) {
    add({ nivel: 'erro', codigo: 'linhas_demais', mensagem: `O envio excede o limite de ${MAX_LINHAS} linhas. Divida em mais de um envio.` });
    brutas.length = MAX_LINHAS;
  }

  // PII no cabeçalho (observação geral).
  for (const [campo, v] of Object.entries(cab)) {
    const tipos = detectarPii(String(v ?? ''), campo === 'observacao_geral');
    if (tipos.length) celulasPii.push({ linha: null, campo, tipos });
  }

  const linhas: LinhaNormalizada[] = [];
  brutas.forEach((bruta, idx) => {
    const n = idx + 1;
    const erro = (campo: string, codigo: string, mensagem: string) => {
      add({ nivel: 'erro', codigo, mensagem, linha: n, campo });
      invalida = true;
    };
    let invalida = false;
    const val: Record<string, string> = {};
    const get = (k: string) => (bruta[k] ?? '').toString().trim() || (cab[k] ?? '').toString().trim();

    // Condicional: tipo_atendimento exigido quando o tipo de registro é atendimento de serviço.
    const tipoRegBruto = get('tipo_registro');
    const tipoRegCodigo = dominios.tipo_registro?.get(chaveTexto(tipoRegBruto));

    for (const c of CAMPOS_LINHA) {
      const bruto = get(c.chave);
      const exigido =
        c.obrigatorio ||
        (c.condicional?.valoresQueExigem && tipoRegCodigo && c.condicional.valoresQueExigem.includes(tipoRegCodigo));

      const tipos = detectarPii(bruto, !!c.textoLivre);
      if (tipos.length) celulasPii.push({ linha: n, campo: c.chave, tipos });

      if (bruto === '') {
        if (exigido) erro(c.chave, 'obrigatorio', `${c.rotulo}: preenchimento obrigatório.`);
        continue;
      }
      if (c.max && bruto.length > c.max) {
        erro(c.chave, 'tamanho', `${c.rotulo}: use no máximo ${c.max} caracteres.`);
        continue;
      }
      switch (c.tipo) {
        case 'data': {
          const d = normalizarData(bruto);
          if (!d) erro(c.chave, 'data_invalida', `${c.rotulo}: data inválida. Use dd/mm/aaaa ou aaaa-mm-dd.`);
          else val[c.chave] = d;
          break;
        }
        case 'inteiro': {
          const r = normalizarInteiro(bruto);
          if (r.valor === null) {
            const msg =
              r.motivo === 'negativo'
                ? `${c.rotulo}: não pode ser negativa.`
                : `${c.rotulo}: informe um número inteiro (sem decimais).`;
            erro(c.chave, r.motivo === 'negativo' ? 'quantidade_negativa' : 'quantidade_invalida', msg);
          } else val[c.chave] = String(r.valor);
          break;
        }
        case 'dominio': {
          const mapa = c.dominio === 'bairro' ? mapaBairros : dominios[c.dominio ?? ''];
          const cod = mapa?.get(chaveTexto(bruto));
          if (!cod) {
            erro(
              c.chave,
              c.dominio === 'bairro' ? 'bairro_inexistente' : 'dominio_invalido',
              c.dominio === 'bairro'
                ? `Bairro não encontrado no cadastro oficial. Use um bairro da lista.`
                : `${c.rotulo}: valor fora da lista permitida.`,
            );
          } else val[c.chave] = cod;
          break;
        }
        default:
          val[c.chave] = bruto;
      }
    }

    // Período: mesmo mês, ordem correta, não futuro.
    const ini = val.periodo_inicio;
    const fim = val.periodo_fim;
    if (ini && fim) {
      if (fim < ini) erro('periodo_fim', 'periodo_invertido', 'O fim do período é anterior ao início.');
      else if (mesDe(ini) !== mesDe(fim)) erro('periodo_fim', 'periodo_varios_meses', 'O período da linha deve estar dentro de um único mês. Separe em uma linha por mês.');
      if (fim > ctx.hoje.toISOString().slice(0, 10)) erro('periodo_fim', 'periodo_futuro', 'O período não pode estar no futuro.');
      if (ini < `${ctx.hoje.getUTCFullYear() - 10}-01-01`) add({ nivel: 'alerta', codigo: 'periodo_antigo', mensagem: 'Período com mais de 10 anos: confirme se está correto.', linha: n, campo: 'periodo_inicio' });
    }

    // Unidade de contagem × tipo de registro.
    const permitidas = val.tipo_registro ? tipoRegistro.get(val.tipo_registro) : undefined;
    if (val.unidade_contagem && permitidas && !permitidas.includes(val.unidade_contagem)) {
      erro('unidade_contagem', 'unidade_incompativel', 'A unidade de contagem não é compatível com o tipo de registro informado.');
    }

    linhas.push({
      linha: n,
      periodo_inicio: val.periodo_inicio ?? '',
      periodo_fim: val.periodo_fim ?? '',
      bairro: val.bairro ?? '',
      tipo_registro: val.tipo_registro ?? '',
      unidade_contagem: val.unidade_contagem ?? '',
      categoria_violencia: val.categoria_violencia ?? '',
      faixa_etaria: val.faixa_etaria ?? '',
      tipo_atendimento: val.tipo_atendimento,
      canal_entrada: val.canal_entrada,
      relacao_autor: val.relacao_autor,
      situacao_atendimento: val.situacao_atendimento,
      quantidade: val.quantidade !== undefined ? Number(val.quantidade) : 0,
      observacao: val.observacao,
      invalida,
    });
  });

  const validas = linhas.filter((l) => !l.invalida);

  // Duplicidade interna: mesma combinação de dimensões em mais de uma linha.
  const porChave = new Map<string, number[]>();
  for (const l of validas) {
    const k = chaveDimensao(l);
    porChave.set(k, [...(porChave.get(k) ?? []), l.linha]);
  }
  for (const ls of porChave.values()) {
    if (ls.length > 1) {
      add({
        nivel: 'alerta',
        codigo: 'duplicidade_interna',
        mensagem: `Possível duplicidade: as linhas ${ls.join(', ')} têm a mesma combinação de campos. Consolide em uma única linha se forem o mesmo dado.`,
        linha: ls[0],
      });
    }
  }

  // Duplicidade entre envios da mesma entidade.
  if (ctx.hashesExistentes?.size && ctx.hashearLinha) {
    for (const l of validas) {
      if (ctx.hashesExistentes.has(ctx.hashearLinha(l))) {
        add({
          nivel: 'alerta',
          codigo: 'duplicidade_entre_envios',
          mensagem: 'Linha idêntica a uma já recebida em outro envio da entidade para o mesmo período. Confirme se não é reenvio.',
          linha: l.linha,
        });
      }
    }
  }

  // Quantidades por unidade e variação brusca vs. histórico (sem somar unidades diferentes).
  const quantidadePorUnidade: Record<string, number> = {};
  const mesesPorUnidade: Record<string, Set<string>> = {};
  for (const l of validas) {
    quantidadePorUnidade[l.unidade_contagem] = (quantidadePorUnidade[l.unidade_contagem] ?? 0) + l.quantidade;
    (mesesPorUnidade[l.unidade_contagem] ??= new Set()).add(mesDe(l.periodo_inicio));
  }
  const limite = (ctx.variacaoPct ?? 60) / 100;
  for (const [u, total] of Object.entries(quantidadePorUnidade)) {
    const media = ctx.mediasHistoricas?.[u];
    const meses = mesesPorUnidade[u]?.size || 1;
    if (media && media > 0) {
      const mensal = total / meses;
      const v = (mensal - media) / media;
      if (Math.abs(v) > limite) {
        add({
          nivel: 'alerta',
          codigo: 'variacao_brusca',
          mensagem: `Variação de ${Math.round(v * 100)}% em relação à média mensal dos envios anteriores (${Math.round(media)}) para a unidade “${u}”. Confirme os números antes de enviar.`,
        });
      }
    }
  }

  // Possível dado pessoal → alerta e marcação de envio restrito.
  for (const c of celulasPii) {
    add({
      nivel: 'alerta',
      codigo: 'pii_possivel',
      mensagem: `Possível dado pessoal (${c.tipos.map((t) => ROTULO_PII[t]).join(', ')}) no campo “${c.campo}”. O envio será tratado como restrito e não poderá ser aprovado até a correção.`,
      linha: c.linha ?? undefined,
      campo: c.campo,
    });
  }

  const qualidade = calcularQualidade(linhas);
  if (validas.length >= 5 && qualidade.naoInformada > 0.5) {
    add({ nivel: 'alerta', codigo: 'qualidade_nao_informada', mensagem: 'Mais da metade das linhas está como “não informada/não especificada”. Se possível, complete a classificação.' });
  }

  const datas = validas.flatMap((l) => [l.periodo_inicio, l.periodo_fim]).sort();
  const relatorio: RelatorioValidacao = {
    achados,
    restrita: celulasPii.length > 0,
    celulasPii,
    resumo: {
      totalLinhas: linhas.length,
      linhasInvalidas: linhas.filter((l) => l.invalida).length,
      erros: achados.filter((a) => a.nivel === 'erro').length,
      alertas: achados.filter((a) => a.nivel === 'alerta').length,
      quantidadePorUnidade,
      periodoInicio: datas[0] ?? null,
      periodoFim: datas[datas.length - 1] ?? null,
      qualidade,
    },
  };
  return { linhas, relatorio };
}

/** Texto seguro para exibição: nunca inclui conteúdo das células. */
export function podeEnviar(r: RelatorioValidacao): boolean {
  return r.resumo.erros === 0 && r.resumo.totalLinhas > 0;
}
