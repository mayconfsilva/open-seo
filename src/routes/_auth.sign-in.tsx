import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import {
  AuthPageCard,
  AuthMethodChooser,
  TermsAgreementNotice,
  authInputClassName,
  authSubmitClassName,
  authRedirectSearchSchema,
  useAuthPageState,
} from "@/client/features/auth/AuthPage";
import { signUpStatusQueryOptions } from "@/client/features/auth/signUpStatus";
import { useGoogleAuth } from "@/client/features/auth/useGoogleAuth";
import { getFormError } from "@/client/lib/forms";
import { captureClientEvent } from "@/client/lib/posthog";
import { authClient } from "@/lib/auth-client";
import {
  getSignInSearch,
  getVerifyEmailSearch,
  toAuthCallbackURL,
} from "@/lib/auth-redirect";
import { z } from "zod";
import { pageHead } from "@/client/lib/pageHead";

const signInSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a senha."),
});

export const Route = createFileRoute("/_auth/sign-in")({
  head: () => pageHead("Entrar"),
  validateSearch: authRedirectSearchSchema,
  component: SignInPage,
});

function SignInPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { redirectTo, oauthQuery, isHostedMode, isBetterAuthMode } =
    useAuthPageState(search.redirect);
  const [showEmailForm, setShowEmailForm] = useState(false);
  // The standalone Docker edition has accounts but no Google sign-in and no
  // emailed password reset: go straight to the email form. Accounts come from
  // invitations, and a fresh installation has nobody to sign in, so its first
  // visitor is sent to create the admin account instead.
  const emailOnly = isBetterAuthMode && !isHostedMode;
  const emailFormVisible = showEmailForm || emailOnly;
  const google = useGoogleAuth({ redirectTo });
  const signUpStatus = useQuery({
    ...signUpStatusQueryOptions(),
    enabled: emailOnly,
  });
  const firstAccount = signUpStatus.data?.firstAccount === true;
  useEffect(() => {
    if (!firstAccount) return;
    void navigate({
      to: "/sign-up",
      search: getSignInSearch(redirectTo),
      replace: true,
    });
  }, [firstAccount, navigate, redirectTo]);

  const form = useAppForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signInSchema,
    },
    onSubmit: async ({ formApi, value }) => {
      try {
        const email = value.email.trim();
        captureClientEvent("auth:sign_in_submit", {
          redirect_to: redirectTo,
        });

        const result = await authClient.signIn.email({
          email,
          password: value.password,
          callbackURL: toAuthCallbackURL(redirectTo),
          ...(oauthQuery ? { oauth_query: oauthQuery } : {}),
        });

        if (!result.error) {
          captureClientEvent("auth:sign_in_success", {
            redirect_to: redirectTo,
          });
          return;
        }

        if (result.error.status === 403) {
          captureClientEvent("auth:sign_in_block_unverified", {
            redirect_to: redirectTo,
          });
          // Email not verified yet: send them to the verification page (which
          // shows "check your inbox" + resend) instead of leaving them on a
          // sign-in form that will keep rejecting them.
          void navigate({
            to: "/verify-email",
            search: getVerifyEmailSearch(email, redirectTo),
          });
          return;
        }

        formApi.setErrorMap({
          onSubmit: {
            form: "E-mail ou senha incorretos.",
            fields: {},
          },
        });
      } catch {
        formApi.setErrorMap({
          onSubmit: {
            form: "Não foi possível entrar agora. Tente de novo.",
            fields: {},
          },
        });
      }
    },
  });

  return (
    <AuthPageCard
      title="Entrar"
      helperText="Acesse a carteira e os projetos que você acompanha."
      footer={
        emailOnly ? (
          <p className="text-sm text-foreground/50">
            Não tem conta? Peça um convite ao administrador. Esqueceu a senha?
            Peça ao administrador do servidor para redefinir.
          </p>
        ) : isHostedMode ? (
          <div
            className={
              showEmailForm
                ? "flex w-full justify-between text-sm text-foreground/50"
                : "w-full text-sm text-foreground/50"
            }
          >
            {showEmailForm ? (
              <Link
                to="/forgot-password"
                search={getSignInSearch(redirectTo)}
                className="text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
              >
                Esqueci a senha
              </Link>
            ) : null}
            <Link
              to="/sign-up"
              search={getSignInSearch(redirectTo)}
              className="text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
            >
              Criar conta
            </Link>
          </div>
        ) : null
      }
    >
      {!emailFormVisible ? (
        <>
          <AuthMethodChooser
            googleLabel="Continuar com Google"
            disabled={!isHostedMode}
            isBusy={google.isStarting}
            onContinueWithGoogle={() => {
              void google.start();
            }}
            onContinueWithEmail={() => {
              setShowEmailForm(true);
              google.clearError();
            }}
          />
          {isHostedMode ? (
            <TermsAgreementNotice action="Ao continuar com o Google" />
          ) : null}
          {google.error ? (
            <p className="text-sm text-destructive">{google.error}</p>
          ) : null}
        </>
      ) : (
        <form.AppForm>
          <form.Form className="space-y-4">
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  label="E-mail"
                  className={authInputClassName}
                  type="email"
                  placeholder="voce@agencia.com.br"
                  autoComplete="email"
                  required
                />
              )}
            </form.AppField>
            <form.AppField name="password">
              {(field) => (
                <field.TextField
                  label="Senha"
                  className={authInputClassName}
                  type="password"
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  required
                />
              )}
            </form.AppField>

            <form.Subscribe
              selector={(state) => ({
                submitError: state.errorMap.onSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ submitError, isSubmitting }) => {
                const errorMessage = getFormError(submitError);
                return (
                  <>
                    {errorMessage ? (
                      <p className="text-sm text-destructive">{errorMessage}</p>
                    ) : null}
                    <Button
                      type="submit"
                      variant="secondary"
                      className={authSubmitClassName}
                      pending={isSubmitting}
                    >
                      {isSubmitting ? "Entrando..." : "Entrar"}
                    </Button>
                  </>
                );
              }}
            </form.Subscribe>
          </form.Form>
        </form.AppForm>
      )}
    </AuthPageCard>
  );
}
