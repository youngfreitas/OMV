export class ErroAcesso extends Error {
  constructor(
    public status: 401 | 403,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroAcesso';
  }
}

export class ErroNegocio extends Error {
  constructor(
    mensagem: string,
    public codigo = 'negocio',
  ) {
    super(mensagem);
    this.name = 'ErroNegocio';
  }
}
