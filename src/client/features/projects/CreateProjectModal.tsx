import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { revalidateLogic } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { FieldDescription } from "@/client/components/ui/field";
import {
  getLastProjectId,
  setLastProjectId,
} from "@/client/lib/active-project";
import {
  getErrorCode,
  getStandardErrorMessage,
} from "@/client/lib/error-messages";
import {
  DEFAULT_LOCATION_CODE,
  getLanguageCode,
} from "@/client/features/keywords/locations";
import { ProjectMarketFields } from "@/client/features/projects/ProjectMarketFields";
import { toastInitialAudit } from "@/client/features/projects/initialAuditToast";
import { createProject } from "@/serverFunctions/projects";
import { isEveryAppClientAuthMode } from "@/lib/auth-mode";

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do projeto"),
  domain: z.string(),
  market: z.object({ locationCode: z.number(), languageCode: z.string() }),
});

// The server sends only the error code, so the field messages live here.
const SERVER_FIELD_ERRORS: Record<string, Record<string, string>> = {
  VALIDATION_ERROR: { domain: "Enter a valid domain, like acme.com." },
  CONFLICT: {
    name: "Já existe um projeto chamado \"Default\" sem domínio. Escolha outro nome ou informe um domínio.",
  },
};

export function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // A new project starts in the market of the project the user is working in.
  const projects = useQuery(projectsQueryOptions());
  const currentProject = projects.data?.find(
    (project) => project.id === getLastProjectId(),
  );

  const createMutation = useMutation({
    mutationFn: (values: z.infer<typeof createProjectSchema>) =>
      createProject({
        data: {
          name: values.name.trim(),
          domain: values.domain.trim() || undefined,
          ...values.market,
        },
      }),
    // The form shows field errors inline and toasts the rest itself.
    meta: { errorToast: false },
    onSuccess: async (created) => {
      setLastProjectId(created.id);
      await queryClient.invalidateQueries({
        queryKey: projectsQueryOptions().queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: ["dashboardActivation"],
      });
      onClose();
      toast.success("Projeto criado");
      toastInitialAudit(created.initialAudit);
      // Continue setup through the new project’s dashboard.
      void navigate({
        to: "/p/$projectId",
        params: { projectId: created.id },
      });
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: "",
      domain: "",
      market: {
        locationCode: currentProject?.locationCode ?? DEFAULT_LOCATION_CODE,
        languageCode:
          currentProject?.languageCode ??
          getLanguageCode(DEFAULT_LOCATION_CODE),
      },
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: createProjectSchema },
    onSubmit: async ({ value, formApi }) => {
      try {
        await createMutation.mutateAsync(value);
      } catch (error) {
        const fields = SERVER_FIELD_ERRORS[getErrorCode(error) ?? ""];
        if (fields) {
          formApi.setErrorMap({ onSubmit: { fields } });
        } else {
          toast.error(getStandardErrorMessage(error));
        }
      }
    },
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !createMutation.isPending) onClose();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <form.AppForm>
          <form.Form className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Novo projeto</DialogTitle>
            </DialogHeader>

            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label="Nome"
                  placeholder="Empresa Exemplo"
                  maxLength={120}
                  required
                />
              )}
            </form.AppField>

            <p className="text-sm text-muted-foreground">
              {isEveryAppClientAuthMode()
                ? "Cadastrar o site inicia uma auditoria de 50 páginas."
                : "Cadastrar o site inicia uma varredura de 50 páginas com renderização de JavaScript. A renderização usa seus créditos."}
            </p>
            <form.AppField name="domain">
              {(field) => (
                <field.TextField
                  label={
                    <>
                      Domínio{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </>
                  }
                  description="Você pode conectar o Search Console e configurar o monitoramento de posições depois de criar o projeto."
                  placeholder="example.com"
                  maxLength={255}
                />
              )}
            </form.AppField>

            <div className="flex flex-col gap-2">
              <form.Field name="market">
                {(field) => (
                  <ProjectMarketFields
                    value={field.state.value}
                    onChange={field.handleChange}
                  />
                )}
              </form.Field>
              <FieldDescription>
                Os dados de palavras, SERP e domínio usam este país e idioma, a menos que uma consulta peça outro. Dá para mudar depois nas configurações do projeto.
              </FieldDescription>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={createMutation.isPending}
              >
                Cancelar
              </Button>
              <form.SubmitButton>Criar projeto</form.SubmitButton>
            </DialogFooter>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
