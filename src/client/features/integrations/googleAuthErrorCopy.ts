import { ACCOUNT_DELETION_SCHEDULED_ERROR } from "@/shared/account-deletion";

/**
 * Plain-language copy for Google OAuth failures, shared by the connect-surface
 * inline alert (GoogleLinkErrorAlert) and the /auth-error fallback page.
 * `code` is the `error` query param on the redirect: Google's own error code
 * (access_denied), or one set by googleOAuth.ts / Better Auth.
 *
 * `providerLabel` ("Search Console" / "Google Analytics") is set when the
 * failure came from a connect flow; without it the copy reads as a Google
 * sign-in failure.
 */
export function googleAuthErrorCopy(
  code: string,
  providerLabel?: string,
): { title: string; description: string } {
  const what = providerLabel
    ? `a conexão com o ${providerLabel}`
    : "o login com o Google";

  switch (code) {
    case ACCOUNT_DELETION_SCHEDULED_ERROR:
      return {
        title: "Esta conta está sendo excluída",
        description:
          "Você pediu a exclusão desta conta, então não é possível entrar nela. Para mantê-la, fale com o suporte antes da data de exclusão.",
      };
    case "state_mismatch":
      return {
        title: `Não foi possível concluir ${what}`,
        description:
          "A tentativa expirou ou foi interrompida. Tente de novo numa única aba e conclua as etapas do Google em até 10 minutos. Se continuar, confira se o navegador permite cookies deste site.",
      };
    case "access_denied":
      return {
        title: `Permissão negada para ${what}`,
        description:
          "A tela de permissão do Google foi fechada ou recusada. Tente de novo quando quiser.",
      };
    case "scope_not_granted":
      return {
        title: `Falta uma permissão para ${what}`,
        description: `O dataSEO não recebeu acesso aos dados do ${providerLabel ?? "Google"} porque uma opção da tela de permissão do Google ficou desmarcada. Tente de novo e marque todas as opções antes de continuar.`,
      };
    case "connection_save_failed":
      return {
        title: `Não foi possível concluir ${what}`,
        description:
          "Não foi possível salvar a conexão. Tente de novo e, se continuar falhando, fale com o suporte.",
      };
    default:
      return {
        title: `Não foi possível concluir ${what}`,
        description:
          "Algo deu errado na comunicação com o Google. Tente de novo e, se continuar falhando, fale com o suporte.",
      };
  }
}
