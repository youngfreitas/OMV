/**
 * Detecção de POSSÍVEL dado pessoal em texto. Heurística conservadora: gera alertas, nunca acusações.
 * O trecho encontrado NUNCA é devolvido — apenas o tipo.
 */
export type TipoPii =
  | 'cpf'
  | 'rg'
  | 'telefone'
  | 'email'
  | 'cep'
  | 'logradouro'
  | 'nome_proprio'
  | 'coordenada'
  | 'data_nascimento';

export const ROTULO_PII: Record<TipoPii, string> = {
  cpf: 'CPF',
  rg: 'RG',
  telefone: 'telefone',
  email: 'e-mail',
  cep: 'CEP',
  logradouro: 'endereço (logradouro)',
  nome_proprio: 'possível nome de pessoa',
  coordenada: 'coordenadas geográficas',
  data_nascimento: 'data de nascimento',
};

function cpfValido(digitos: string): boolean {
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;
  const d = digitos.split('').map(Number);
  for (const t of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += d[i]! * (t + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== d[t]) return false;
  }
  return true;
}

const PRIMEIROS_NOMES = new Set(
  `maria ana francisca antonia adriana juliana marcia fernanda patricia aline sandra camila amanda bruna jessica leticia julia luciana vanessa mariana gabriela rafaela beatriz larissa carolina daniela simone renata cristiane tatiane claudia sonia rosa rita regina helena aparecida terezinha lucia luzia raimunda joana carla elaine eliane marta vera paula natalia debora sueli silvia andreia angela livia isabel isabela sara sarah priscila michele michelle viviane monica jose joao antonio francisco carlos paulo pedro lucas luiz luis marcos luciano gabriel rafael daniel marcelo bruno eduardo felipe rodrigo manoel manuel ricardo fernando fabio roberto sergio jorge andre alexandre claudio mateus matheus thiago tiago diego vinicius gustavo henrique renato geraldo`
    .split(/\s+/),
);

const CONECTORES = new Set(['da', 'de', 'do', 'dos', 'das', 'e']);

function semAcento(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function temNomeProprio(texto: string): boolean {
  const tokens = texto.split(/[\s,;:()/]+/).filter(Boolean);
  const cap = (t: string) => /^[A-ZÀ-Ý][a-zà-ÿ]{1,}$/.test(t);
  let seq: string[] = [];
  const fecha = () => {
    const nomes = seq.filter((t) => !CONECTORES.has(t.toLowerCase()));
    const primeiro = semAcento(nomes[0] ?? '').toLowerCase();
    const achou = (nomes.length >= 2 && PRIMEIROS_NOMES.has(primeiro)) || nomes.length >= 3;
    seq = [];
    return achou;
  };
  for (const t of tokens) {
    if (cap(t) || (seq.length > 0 && CONECTORES.has(t.toLowerCase()))) seq.push(t);
    else if (fecha()) return true;
  }
  return fecha();
}

/** `livre`: texto livre (aplica também a heurística de nomes próprios). */
export function detectarPii(texto: string, livre = false): TipoPii[] {
  const achados = new Set<TipoPii>();
  const t = texto ?? '';
  if (!t.trim()) return [];

  if (/[\w.+-]+@[\w-]+(\.[\w-]+)+/.test(t)) achados.add('email');

  // CPF: formatado (mesmo com dígito inválido) ou 11 dígitos com dígito verificador válido.
  let semCpf = t;
  for (const m of t.matchAll(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b/g)) {
    const dig = m[0].replace(/\D/g, '');
    if (m[0].includes('.') || cpfValido(dig)) {
      achados.add('cpf');
      semCpf = semCpf.replace(m[0], ' ');
    }
  }

  if (/\bRG\b[\s:.nº°]*\d/i.test(t) || /\b\d{1,2}\.\d{3}\.\d{3}-[\dXx]\b/.test(semCpf)) achados.add('rg');

  if (/\bCEP\b[\s:.]*\d{5}-?\d{3}/i.test(t) || /\b\d{5}-\d{3}\b/.test(t)) achados.add('cep');

  // Telefone: DDD + 8/9 dígitos, com ou sem separadores.
  if (/(?:\+?55[\s.-]?)?\(?\b[1-9]\d\)?[\s.-]?9?\d{4}[\s.-]?\d{4}\b/.test(semCpf.replace(/\b\d{5}-\d{3}\b/g, ' '))) {
    achados.add('telefone');
  }

  if (/\b(rua|r\.|avenida|av\.|travessa|tv\.|alameda|estrada|rodovia|pra[cç]a|largo|beco|servid[aã]o)\s+[A-Za-zÀ-ÿ0-9]{2,}/i.test(t)) {
    achados.add('logradouro');
  }

  if (/-?\d{1,3}\.\d{4,}\s*[,;]\s*-?\d{1,3}\.\d{4,}/.test(t)) achados.add('coordenada');

  if (/\bnasc\w*\b.{0,20}\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/i.test(t)) achados.add('data_nascimento');

  if (livre && temNomeProprio(t)) achados.add('nome_proprio');

  return [...achados];
}
