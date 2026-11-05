export class HttpError extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

export const err = (status, mensagem) => new HttpError(status, mensagem);
