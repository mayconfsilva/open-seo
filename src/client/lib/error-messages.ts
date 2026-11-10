import { FREE_MAX_AUDIT_PAGES } from "@/shared/audit-limits";
import { GATEWAY_RENDERING_NOT_SET_UP_MESSAGE } from "@/shared/audit-rendering";
import { isErrorCode, type ErrorCode } from "@/shared/error-codes";
import {
  isEveryAppClientAuthMode,
  isHostedClientAuthMode,
} from "@/lib/auth-mode";

/**
 * Copy for an error we did not expect. Hosted users cannot read our logs, so
 * they get support; a self-hoster runs the server and can.
 */
export const UNEXPECTED_ERROR_MESSAGE = isHostedClientAuthMode()
  ? "Algo deu errado do nosso lado. Tente de novo e fale com o suporte se continuar."
  : "Algo deu errado. Tente de novo ou veja os logs do servidor.";

const STANDARD_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHENTICATED: "Entre e tente de novo.",
  AUTH_CONFIG_MISSING: isEveryAppClientAuthMode()
    ? "OpenSEO can't reach your Every App gateway for this right now. An owner or admin can check its setup with pnpm everyapp status."
    : "OpenSEO auth is not configured. Follow the README setup steps for Cloudflare Access.",
  PAYMENT_REQUIRED:
    "An active hosted subscription is required before you can use OpenSEO.",
  INSUFFICIENT_CREDITS:
    "Você não tem créditos suficientes. Mude de plano ou compre mais créditos para continuar.",
  PAYMENT_METHOD_REQUIRED:
    "We couldn't charge a card on file. Add or update your card in the billing portal, then try again.",
  PAYMENT_ACTION_REQUIRED:
    "Your bank needs more time or a confirmation for this charge. Check your balance in a minute; if nothing arrived, buy your first top-up with the Buy credits button, then turn on auto-reload.",
  AUDIT_RENDERING_UNAVAILABLE: isEveryAppClientAuthMode()
    ? GATEWAY_RENDERING_NOT_SET_UP_MESSAGE
    : "A renderização de JavaScript não está configurada nesta instalação. Peça ao administrador para ativar.",
  FORBIDDEN: "You do not have access to this resource.",
  NOT_FOUND: "O item solicitado não foi encontrado.",
  AUDIT_CAPACITY_REACHED:
    "Você atingiu o limite de auditorias. Exclua auditorias antigas para começar outra.",
  AUDIT_PAGE_LIMIT_EXCEEDED: `Free plan audits are limited to ${FREE_MAX_AUDIT_PAGES} pages. Upgrade to run larger audits.`,
  AUDIT_ALREADY_RUNNING:
    "Você atingiu o limite de auditorias simultâneas. Espere uma terminar ou exclua antes de começar outra.",
  VALIDATION_ERROR: "Confira os dados e tente de novo.",
  UNKNOWN_LOCATION:
    "Não encontramos essa cidade ou região. Escolha um local da lista ou limpe o campo para buscar no país inteiro.",
  CRAWL_TARGET_BLOCKED: "Este endereço está bloqueado pela política de segurança.",
  BACKLINKS_BILLING_ISSUE:
    "A conta da DataForSEO conectada tem um problema de cobrança ou saldo.",
  AI_SEARCH_BILLING_ISSUE:
    "A conta da DataForSEO conectada tem um problema de cobrança ou saldo.",
  AI_VISIBILITY_ERROR:
    "Não foi possível concluir a consulta de visibilidade em IA. Revise as configurações e tente de novo.",
  DATAFORSEO_AUTH_FAILED: isEveryAppClientAuthMode()
    ? "DataForSEO isn't set up on your Every App gateway yet, or rejected the key it holds. An owner or admin sets it with pnpm everyapp secret set DATAFORSEO_API_KEY."
    : "DataForSEO rejected the credentials. Check that DATAFORSEO_API_KEY is the base64 of your DataForSEO login:password, and that the DataForSEO account is verified and has API access.",
  RATE_LIMITED: "Requisições demais. Aguarde e tente de novo.",
  UPSTREAM_UNAVAILABLE:
    "O provedor de dados está fora do ar no momento. Tente de novo daqui a pouco.",
  CONFLICT: "Esta ação conflita com dados existentes.",
  INTERNAL_ERROR: UNEXPECTED_ERROR_MESSAGE,
};

export function getStandardErrorMessage(
  error: unknown,
  fallback: string = STANDARD_MESSAGES.INTERNAL_ERROR,
): string {
  if (!(error instanceof Error)) return fallback;
  if (isErrorCode(error.message)) return STANDARD_MESSAGES[error.message];
  if (error.message) return error.message;
  return fallback;
}

export function getErrorCode(error: unknown): ErrorCode | null {
  if (!(error instanceof Error)) return null;
  return isErrorCode(error.message) ? error.message : null;
}
