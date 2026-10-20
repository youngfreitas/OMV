export const COOKIE_SESSAO = 'omv_sessao';
export const SESSAO_OCIOSA_MS = Number(process.env.OMV_SESSAO_OCIOSA_MIN ?? 30) * 60_000;
export const SESSAO_ABSOLUTA_MS = Number(process.env.OMV_SESSAO_ABSOLUTA_H ?? 12) * 3_600_000;
export const JANELA_TENTATIVAS_MS = 15 * 60_000;
export const MAX_TENTATIVAS_CONTA = 5;
export const MAX_TENTATIVAS_IP = 20;
