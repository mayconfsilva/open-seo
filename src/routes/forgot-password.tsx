import { Link, createFileRoute } from "@tanstack/react-router";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import {
  AuthPageCard,
  AuthPageShell,
  authRedirectSearchSchema,
  authSubmitClassName,
} from "@/client/features/auth/AuthPage";
import { getFormError } from "@/client/lib/forms";
import { authClient } from "@/lib/auth-client";
import { isHostedClientAuthMode, usesBetterAuthClient } from "@/lib/auth-mode";
import { getSignInSearch, normalizeAuthRedirect } from "@/lib/auth-redirect";
import { z } from "zod";
import { pageHead } from "@/client/lib/pageHead";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
});

export const Route = createFileRoute("/forgot-password")({
  head: () => pageHead("Esqueci a senha"),
  validateSearch: authRedirectSearchSchema,
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const search = Route.useSearch();
  const redirectTo = normalizeAuthRedirect(search.redirect);
  const isHostedMode = isHostedClientAuthMode();
  // Self-hosted accounts have no email transport; the operator resets
  // passwords with the admin command.
  const isOperatorReset = !isHostedMode && usesBetterAuthClient();

  const form = useAppForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: forgotPasswordSchema,
    },
    onSubmit: async ({ formApi, value }) => {
      try {
        const redirectUrl = new URL("/reset-password", window.location.origin);
        if (redirectTo !== "/")
          redirectUrl.searchParams.set("redirect", redirectTo);
        const result = await authClient.requestPasswordReset({
          email: value.email.trim(),
          redirectTo: redirectUrl.toString(),
        });

        if (result.error) {
          formApi.setErrorMap({
            onSubmit: {
              form:
                result.error.message ||
                "Não foi possível enviar o e-mail de redefinição.",
              fields: {},
            },
          });
          return;
        }
      } catch {
        formApi.setErrorMap({
          onSubmit: {
            form: "Não foi possível enviar o e-mail agora. Tente de novo.",
            fields: {},
          },
        });
      }
    },
  });

  return (
    <AuthPageShell>
      <form.Subscribe
        selector={(state) => ({
          isSuccess: state.isSubmitSuccessful && !state.errorMap.onSubmit,
          submittedEmail: state.values.email,
          submitError: state.errorMap.onSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ isSuccess, submittedEmail, submitError, isSubmitting }) => {
          const errorMessage = getFormError(submitError);

          return (
            <AuthPageCard
              title={isSuccess ? "Confira seu e-mail" : "Esqueci a senha"}
              helperText={
                isSuccess
                  ? undefined
                  : isHostedMode
                    ? "Informe seu e-mail e enviaremos um link para redefinir a senha."
                    : isOperatorReset
                      ? "Peça ao administrador do servidor para redefinir sua senha."
                      : "A redefinição de senha não está disponível agora."
              }
              footer={
                <p className="text-sm">
                  <Link
                    to="/sign-in"
                    search={getSignInSearch(redirectTo)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Voltar para entrar
                  </Link>
                </p>
              }
            >
              {isSuccess ? (
                <Alert variant="success">
                  <AlertDescription>
                    Se existir uma conta para {submittedEmail}, você vai receber
                    as instruções para redefinir a senha em instantes.
                  </AlertDescription>
                </Alert>
              ) : (
                <form.AppForm>
                  <form.Form className="space-y-4">
                    <form.AppField name="email">
                      {(field) => (
                        <field.TextField
                          label="E-mail"
                          type="email"
                          placeholder="voce@agencia.com.br"
                          autoComplete="email"
                          disabled={!isHostedMode}
                          required
                        />
                      )}
                    </form.AppField>

                    {errorMessage ? (
                      <Alert variant="destructive">
                        <AlertDescription>{errorMessage}</AlertDescription>
                      </Alert>
                    ) : null}
                    <Button
                      type="submit"
                      variant="secondary"
                      className={authSubmitClassName}
                      pending={isSubmitting}
                      disabled={!isHostedMode}
                    >
                      {isSubmitting ? "Enviando o link..." : "Enviar link"}
                    </Button>
                  </form.Form>
                </form.AppForm>
              )}
            </AuthPageCard>
          );
        }}
      </form.Subscribe>
    </AuthPageShell>
  );
}
