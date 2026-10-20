import { Banner, StatCard } from '@/components/ds';
import { fmtNumero, fmtPercentual } from '@/lib/formato';
import { DOMINIOS_PADRAO } from '@/lib/dicionario/dominios';
import type { Achado, RelatorioValidacao } from '@/lib/validacao/tipos';

const ROT_UNIDADE = Object.fromEntries(DOMINIOS_PADRAO.unidade_contagem.map((u) => [u.codigo, u.rotulo]));

function Lista({ itens, titulo, tipo }: { itens: Achado[]; titulo: string; tipo: 'erro' | 'alerta' }) {
  if (!itens.length) return null;
  return (
    <Banner tipo={tipo} titulo={`${titulo} (${itens.length})`}>
      <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
        {itens.slice(0, 50).map((a, i) => (
          <li key={i}>
            {a.linha ? <strong>Linha {a.linha}: </strong> : null}
            {a.mensagem}
          </li>
        ))}
        {itens.length > 50 ? <li>… e mais {itens.length - 50}.</li> : null}
      </ul>
    </Banner>
  );
}

/** Relatório de validação: mostra o que foi encontrado, sem reproduzir o conteúdo das células. */
export function RelatorioView({ r }: { r: RelatorioValidacao }) {
  const erros = r.achados.filter((a) => a.nivel === 'erro');
  const alertas = r.achados.filter((a) => a.nivel === 'alerta');
  const qpu = Object.entries(r.resumo.quantidadePorUnidade);
  return (
    <div className="form-pilha">
      <div className="omv-grid omv-grid-3">
        <StatCard icon="ocorrencias" label="Linhas lidas" value={fmtNumero(r.resumo.totalLinhas)} note={`${r.resumo.linhasInvalidas} com erro`} />
        {qpu.map(([u, q]) => (
          <StatCard key={u} icon="indicadores" label={ROT_UNIDADE[u] ?? u} value={fmtNumero(q)} note="Medidas distintas nunca são somadas" />
        ))}
        <StatCard icon="escudo" label="Completude dos campos opcionais" value={fmtPercentual(r.resumo.qualidade.completudeOpcionais)} note={`Não informada/especificada: ${fmtPercentual(r.resumo.qualidade.naoInformada)}`} />
      </div>
      {r.restrita ? (
        <Banner tipo="erro" titulo="Possível dado pessoal detectado">
          O envio será tratado como restrito e não poderá ser aprovado até que o conteúdo seja corrigido. Os trechos detectados não são reproduzidos aqui.
        </Banner>
      ) : null}
      <Lista itens={erros} titulo="Erros que impedem o envio" tipo="erro" />
      <Lista itens={alertas.filter((a) => a.codigo !== 'pii_possivel')} titulo="Alertas para conferência" tipo="alerta" />
      <Lista itens={alertas.filter((a) => a.codigo === 'pii_possivel')} titulo="Possível dado pessoal" tipo="alerta" />
      {!erros.length && !alertas.length ? <Banner tipo="info">Nenhum problema encontrado.</Banner> : null}
    </div>
  );
}
