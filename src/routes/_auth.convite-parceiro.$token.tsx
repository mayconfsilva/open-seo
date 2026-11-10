import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PageLoading } from "@/client/components/Spinner";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import {
  AuthPageCard,
  authInputClassName,
  authSubmitClassName,
} from "@/client/features/auth/AuthPage";
import { passwordSchema } from "@/client/features/auth/passwordSchema";
import { getFormError } from "@/client/lib/forms";
import { pageHead } from "@/client/lib/pageHead";
import { authClient } from "@/lib/auth-client";

const invitationSchema = z.object({
  agencyName: z.string(),
  email: z.string(),
});

const acceptSchema = z
  .object({
    name: z.string().trim().min(1, "Informe seu nome."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

export const Route = createFileRoute("/_auth/convite-parceiro/$token")({
  head: () => pageHead("Convite"),
  component: PartnerInvitationPage,
});

async function readError(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  const parsed = z.object({ error: z.string() }).safeParse(body);
  return parsed.success ? parsed.data.error : "Algo deu errado. Tente de novo.";
}

// dataSEO: a partner agency opens the platform owner's single-use link, picks
// a name and password, and lands in its own new organization.
function PartnerInvitationPage() {
  const { token } = Route.useParams();
  const invitation = useQuery({
    queryKey: ["partner-invitation", token],
    queryFn: async () => {
      const response = await fetch(
        `/api/partner-invitation/${encodeURIComponent(token)}`,
      );
      if (!response.ok) throw new Error(await readError(response));
      return invitationSchema.parse(await response.json());
    },
    retry: false,
  });

  const form = useAppForm({
    defaultValues: { name: "", password: "", confirmPassword: "" },
    validators: { onSubmit: acceptSchema },
    onSubmit: async ({ value, formApi }) => {
      const fail = (message: string) =>
        formApi.setErrorMap({ onSubmit: { form: message, fields: {} } });
      const response = await fetch(
        `/api/partner-invitation/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: value.name.trim(),
            password: value.password,
          }),
        },
      );
      if (!response.ok) return fail(await readError(response));
      // The layout sends the new session to the app.
      const signedIn = await authClient.signIn.email({
        email: invitation.data?.email ?? "",
        password: value.password,
      });
      if (signedIn.error) fail("Conta criada. Entre com seu e-mail e senha.");
    },
  });

  if (invitation.isPending) return <PageLoading />;

  if (invitation.isError) {
    return (
      <AuthPageCard
        title="Convite indisponível"
        helperText="Este link é inválido, já foi usado ou venceu. Peça um novo convite ao administrador da plataforma."
        footer={
          <p className="text-sm">
            <Link
              to="/sign-in"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Ir para entrar
            </Link>
          </p>
        }
      >
        {null}
      </AuthPageCard>
    );
  }

  return (
    <AuthPageCard
      title={`Bem-vindo, ${invitation.data.agencyName}`}
      helperText={`Crie seu acesso para ${invitation.data.email}. A organização da sua agência é criada junto.`}
    >
      <form.AppForm>
        <form.Form className="space-y-4">
          <form.AppField name="name">
            {(field) => (
              <field.TextField
                label="Seu nome"
                className={authInputClassName}
                autoComplete="name"
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
                placeholder="Crie uma senha"
                autoComplete="new-password"
                required
              />
            )}
          </form.AppField>
          <form.AppField name="confirmPassword">
            {(field) => (
              <field.TextField
                label="Confirme a senha"
                className={authInputClassName}
                type="password"
                placeholder="Repita a senha"
                autoComplete="new-password"
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
                    {isSubmitting ? "Criando o acesso..." : "Criar acesso"}
                  </Button>
                </>
              );
            }}
          </form.Subscribe>
        </form.Form>
      </form.AppForm>
    </AuthPageCard>
  );
}
