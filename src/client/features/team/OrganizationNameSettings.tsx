import { useQueryClient } from "@tanstack/react-query";
import { revalidateLogic } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { CardShell } from "@/client/components/CardShell";
import { useAppForm } from "@/client/components/form/useAppForm";
import { organizationContextQueryOptions } from "@/client/features/team/organizationQueries";
import { authClient } from "@/lib/auth-client";

const nameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome.")
    .max(100, "Use até 100 caracteres."),
});

// The name shown at the top of the sidebar. better-auth's update endpoint
// checks organization:update, which owners and admins have.
export function OrganizationNameSettings({
  organizationId,
  name,
}: {
  organizationId: string;
  name: string;
}) {
  const queryClient = useQueryClient();
  const form = useAppForm({
    defaultValues: { name },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: nameSchema },
    onSubmit: async ({ value }) => {
      const result = await authClient.organization.update({
        organizationId,
        data: { name: value.name.trim() },
      });
      if (result.error) {
        toast.error("Não foi possível salvar o nome.");
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: organizationContextQueryOptions().queryKey,
      });
      toast.success("Nome salvo");
    },
  });

  return (
    <CardShell title="Organização">
      <form.AppForm>
        <form.Form className="flex max-w-md flex-col gap-3">
          <form.AppField name="name">
            {(field) => (
              <field.TextField
                label="Nome da organização"
                description="Aparece no topo da barra lateral para toda a equipe."
                autoComplete="organization"
              />
            )}
          </form.AppField>
          <div>
            <form.SubmitButton>Salvar</form.SubmitButton>
          </div>
        </form.Form>
      </form.AppForm>
    </CardShell>
  );
}
