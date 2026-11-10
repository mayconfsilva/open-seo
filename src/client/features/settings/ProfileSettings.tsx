import { revalidateLogic } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { SectionHeader } from "@/client/components/PageHeader";
import { useAppForm } from "@/client/components/form/useAppForm";
import { authClient, useSession } from "@/lib/auth-client";
import {
  HOSTED_PASSWORD_MAX_LENGTH,
  HOSTED_PASSWORD_MIN_LENGTH,
} from "@/lib/auth-options";

const nameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe seu nome.")
    .max(100, "Use até 100 caracteres."),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual."),
  newPassword: z
    .string()
    .min(
      HOSTED_PASSWORD_MIN_LENGTH,
      `A senha precisa ter pelo menos ${HOSTED_PASSWORD_MIN_LENGTH} caracteres.`,
    )
    .max(HOSTED_PASSWORD_MAX_LENGTH, "Senha longa demais."),
});

// The signed-in person's own name and password. Email stays fixed: changing
// it needs a verification email this install may not send.
export function ProfileSettings() {
  const { data: session } = useSession();
  if (!session) return null;
  return (
    <section className="space-y-6">
      <SectionHeader title="Perfil" />
      <p className="text-sm text-muted-foreground">
        E-mail de acesso: <span data-ph-mask>{session.user.email}</span>
      </p>
      <NameForm key={session.user.name} name={session.user.name} />
      <PasswordForm />
    </section>
  );
}

function NameForm({ name }: { name: string }) {
  const form = useAppForm({
    defaultValues: { name },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: nameSchema },
    onSubmit: async ({ value }) => {
      const result = await authClient.updateUser({ name: value.name.trim() });
      if (result.error) {
        toast.error("Não foi possível salvar o nome.");
        return;
      }
      toast.success("Nome salvo");
    },
  });

  return (
    <form.AppForm>
      <form.Form className="flex max-w-md flex-col gap-3">
        <form.AppField name="name">
          {(field) => <field.TextField label="Nome" autoComplete="name" />}
        </form.AppField>
        <div>
          <form.SubmitButton>Salvar nome</form.SubmitButton>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

function PasswordForm() {
  const form = useAppForm({
    defaultValues: { currentPassword: "", newPassword: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: passwordSchema },
    onSubmit: async ({ value, formApi }) => {
      const result = await authClient.changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        toast.error(
          result.error.code === "INVALID_PASSWORD"
            ? "A senha atual não confere."
            : "Não foi possível trocar a senha.",
        );
        return;
      }
      formApi.reset();
      toast.success("Senha alterada. As outras sessões foram encerradas.");
    },
  });

  return (
    <form.AppForm>
      <form.Form className="flex max-w-md flex-col gap-3">
        <form.AppField name="currentPassword">
          {(field) => (
            <field.TextField
              label="Senha atual"
              type="password"
              autoComplete="current-password"
            />
          )}
        </form.AppField>
        <form.AppField name="newPassword">
          {(field) => (
            <field.TextField
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              description={`Pelo menos ${HOSTED_PASSWORD_MIN_LENGTH} caracteres.`}
            />
          )}
        </form.AppField>
        <div>
          <form.SubmitButton>Trocar senha</form.SubmitButton>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
