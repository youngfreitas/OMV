import { ButtonLink } from '@/components/ds/Button';
import { EmptyState, Banner } from '@/components/ds/Feedback';
import { StatCard, LinkCard } from '@/components/ds/Cards';
import { Icon } from '@/components/ds/Icon';
import { HeroMapa } from '@/components/landing/HeroMapa';
import { obterResumoPublico } from '@/server/publico';
import { fmtNumero, fmtData } from '@/lib/formato';

export const dynamic = 'force-dynamic';

const OBJETIVOS = [
  {
    icon: 'indicadores',
    titulo: 'Reunir dados da rede',
    texto: 'Consolidar, em um só lugar, informações agregadas enviadas pelas entidades que atendem mulheres em situação de violência.',
  },
  {
    icon: 'mapa',
    titulo: 'Qualificar o território',
    texto: 'Mostrar onde a violência é mais registrada para orientar a presença dos serviços e o planejamento de ações.',
  },
  {
    icon: 'escudo',
    titulo: 'Proteger a privacidade',
    texto: 'Publicar apenas totais protegidos por regras de supressão, de modo que ninguém seja identificado.',
  },
  {
    icon: 'relatorios',
    titulo: 'Apoiar políticas públicas',
    texto: 'Oferecer relatórios e séries históricas para monitorar resultados e prestar contas à sociedade.',
  },
];

const PASSOS = [
  { n: 1, titulo: 'Entidades enviam', texto: 'Serviços da rede preenchem um formulário ou enviam planilhas com números agregados — nunca dados da pessoa atendida.' },
  { n: 2, titulo: 'A equipe revisa', texto: 'Analistas conferem cada envio, pedem correções e só então aprovam. Nada é publicado automaticamente.' },
  { n: 3, titulo: 'O sistema protege', texto: 'Valores pequenos são suprimidos e o território pode ser generalizado para impedir identificação.' },
  { n: 4, titulo: 'O público consulta', texto: 'Os indicadores aprovados e protegidos aparecem no mapa, com data de atualização e notas metodológicas.' },
];

export default async function Landing() {
  const resumo = await obterResumoPublico();
  return (
    <>
      <section className="hero" aria-labelledby="titulo-hero">
        <div className="hero-texto">
          <p className="omv-sobrelinha">Ubatuba · Observatório municipal</p>
          <h1 id="titulo-hero" className="hero-titulo">
            Observatório Municipal de Violência
          </h1>
          <p className="hero-sub">
            Monitoramento agregado da violência doméstica contra mulheres em Ubatuba, para apoiar políticas públicas e fortalecer a rede de proteção.
          </p>
          <div className="omv-linha">
            <ButtonLink href="/mapa" iconRight="seta-direita">
              Ver mapa de indicadores
            </ButtonLink>
            <ButtonLink href="/entrar" variant="secondary" icon="orgao">
              Acesso das entidades
            </ButtonLink>
          </div>
        </div>
        <HeroMapa />
      </section>

      <section id="sobre" className="sec" aria-labelledby="t-sobre">
        <div className="sec-miolo sec-duas">
          <div>
            <p className="omv-sobrelinha">Apresentação</p>
            <h2 id="t-sobre" className="sec-titulo">
              Dados que orientam o cuidado
            </h2>
          </div>
          <div className="sec-prosa">
            <p>
              O OMV é uma plataforma da Prefeitura de Ubatuba, vinculada à Secretaria Municipal de Defesa dos Direitos da Mulher e da
              Pessoa com Deficiência. Ele organiza informações enviadas por entidades da rede e as transforma em indicadores agregados
              sobre a violência doméstica contra mulheres no município.
            </p>
            <p>
              O foco é entender o fenômeno, não identificar pessoas. Por isso o sistema não recebe nome, documento, telefone, e-mail,
              endereço ou localização exata de quem foi atendida.
            </p>
          </div>
        </div>
      </section>

      <section className="sec sec-rebaixada" aria-labelledby="t-objetivos">
        <div className="sec-miolo">
          <p className="omv-sobrelinha">Objetivos</p>
          <h2 id="t-objetivos" className="sec-titulo">
            O que o observatório busca
          </h2>
          <div className="omv-grid omv-grid-2" style={{ marginTop: 24 }}>
            {OBJETIVOS.map((o) => (
              <article key={o.titulo} className="omv-card" style={{ alignItems: 'flex-start' }}>
                <div className="omv-tile">
                  <Icon name={o.icon} size={24} />
                </div>
                <div>
                  <h3 className="card-titulo">{o.titulo}</h3>
                  <p className="card-texto">{o.texto}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="sec" aria-labelledby="t-como">
        <div className="sec-miolo">
          <p className="omv-sobrelinha">Como funciona</p>
          <h2 id="t-como" className="sec-titulo">
            Do envio à publicação, com revisão em cada etapa
          </h2>
          <ol className="passos">
            {PASSOS.map((p) => (
              <li key={p.n} className="passo">
                <span className="passo-n" aria-hidden="true">
                  {p.n}
                </span>
                <h3 className="card-titulo">{p.titulo}</h3>
                <p className="card-texto">{p.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sec sec-rebaixada" aria-labelledby="t-secretaria">
        <div className="sec-miolo sec-duas">
          <div>
            <p className="omv-sobrelinha">A Secretaria</p>
            <h2 id="t-secretaria" className="sec-titulo">
              Secretaria Municipal de Defesa dos Direitos da Mulher e da Pessoa com Deficiência
            </h2>
          </div>
          <div className="sec-prosa">
            <p>
              O OMV está vinculado à Secretaria, que coordena a análise e a publicação dos indicadores.
            </p>
            <Banner tipo="info" titulo="Informações institucionais a confirmar">
              Competências, endereço, horários e contatos oficiais serão inseridos após validação da Secretaria.
            </Banner>
          </div>
        </div>
      </section>

      <section id="indicadores" className="sec" aria-labelledby="t-ind">
        <div className="sec-miolo">
          <p className="omv-sobrelinha">Indicadores públicos</p>
          <h2 id="t-ind" className="sec-titulo">
            Panorama do município
          </h2>
          {resumo.modo === 'vazio' ? (
            <div className="omv-painel" style={{ marginTop: 24 }}>
              <EmptyState titulo="Ainda não há indicadores publicados" icon="indicadores">
                Os números aparecem aqui depois que as entidades enviarem dados, a equipe aprovar e a Secretaria publicar com as
                proteções de privacidade.
              </EmptyState>
            </div>
          ) : (
            <>
              {resumo.modo === 'demo' ? (
                <div style={{ marginTop: 16 }}>
                  <Banner tipo="demo">DEMONSTRAÇÃO — dados fictícios. Não representam a realidade do município.</Banner>
                </div>
              ) : null}
              <div className="omv-grid omv-grid-3" style={{ marginTop: 24 }}>
                {resumo.totais.map((t) => (
                  <StatCard
                    key={t.chave}
                    icon="ocorrencias"
                    label={t.rotulo}
                    value={t.valor === null ? '—' : fmtNumero(t.valor)}
                    note={t.nota}
                  />
                ))}
              </div>
              <p className="omv-legenda" style={{ marginTop: 12 }}>
                {resumo.periodo}
                {resumo.atualizadoEm ? ` · Atualizado em ${fmtData(resumo.atualizadoEm)}` : ''}
              </p>
            </>
          )}
        </div>
      </section>

      <section className="sec sec-destaque" aria-labelledby="t-mapa">
        <div className="sec-miolo sec-duas">
          <div>
            <h2 id="t-mapa" className="sec-titulo sec-titulo-claro">
              Explore o mapa de indicadores
            </h2>
            <p className="sec-claro">Veja os números por território, categoria e período, sempre com as proteções de privacidade.</p>
          </div>
          <div>
            <LinkCard href="/mapa" icon="mapa" label="Abrir o mapa" description="Consulta pública, sem login" />
          </div>
        </div>
      </section>

      <section id="privacidade" className="sec" aria-labelledby="t-priv">
        <div className="sec-miolo">
          <p className="omv-sobrelinha">Privacidade e metodologia</p>
          <h2 id="t-priv" className="sec-titulo">
            Como protegemos as pessoas
          </h2>
          <ul className="lista-priv">
            <li>
              <Icon name="escudo" size={20} /> <span><strong>Sem dados pessoais:</strong> o sistema não coleta nome, documentos, contatos, endereço ou localização exata.</span>
            </li>
            <li>
              <Icon name="filtrar" size={20} /> <span><strong>Supressão estatística:</strong> valores pequenos não são divulgados, e valores que permitiriam recálculo por diferença também são protegidos.</span>
            </li>
            <li>
              <Icon name="mapa" size={20} /> <span><strong>Território generalizado:</strong> quando necessário, bairros são agrupados em regiões.</span>
            </li>
            <li>
              <Icon name="calendario" size={20} /> <span><strong>Medidas distintas:</strong> registros, atendimentos e pessoas atendidas são contagens diferentes e nunca são somadas.</span>
            </li>
            <li>
              <Icon name="info" size={20} /> <span><strong>Parâmetros provisórios:</strong> os limites de supressão aguardam validação da Secretaria e do encarregado de proteção de dados.</span>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
