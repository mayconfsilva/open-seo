import { useState } from "react";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { revalidateLogic } from "@tanstack/react-form";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import { InlineConfirm } from "@/client/components/InlineConfirm";
import { SectionHeader } from "@/client/components/PageHeader";
import { QueryError, QueryState } from "@/client/components/QueryState";
import {
  aiTrackerQueryOptions,
  aiVisibilityKey,
} from "@/client/features/ai-visibility/shared";
import { ProjectMarketFields } from "@/client/features/projects/ProjectMarketFields";
import {
  clearLastProjectId,
  getLastProjectId,
} from "@/client/lib/active-project";
import { toastInitialAudit } from "@/client/features/projects/initialAuditToast";
import { archiveProject, updateProject } from "@/serverFunctions/projects";
import { isEveryAppClientAuthMode } from "@/lib/auth-mode";
import { isDefaultProjectName } from "@/shared/ai-visibility";
import type { ProjectSummary } from "./types";

export function ProjectGeneralSettings({ projectId }: { projectId: string }) {
  const projectsQuery = useQuery(projectsQueryOptions());

  return (
    <QueryState
      query={projectsQuery}
      errorFallback="Não foi possível carregar o projeto"
    >
      {(projects) => {
        const project = projects.find((entry) => entry.id === projectId);
        if (!project) {
          return <QueryError fallback="Projeto não encontrado." />;
        }
        return (
          <div className="space-y-8">
            {/* key resets the form's local state when switching between projects */}
            <GeneralSection key={project.id} project={project} />
            <DangerSection project={project} canArchive={projects.length > 1} />
          </div>
        );
      }}
    </QueryState>
  );
}

const generalSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do projeto."),
  domain: z.string(),
  market: z.object({ locationCode: z.number(), languageCode: z.string() }),
});

function GeneralSection({ project }: { project: ProjectSummary }) {
  const queryClient = useQueryClient();
  const [keepBrand, setKeepBrand] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (values: z.infer<typeof generalSchema>) =>
      updateProject({
        data: {
          projectId: project.id,
          name: values.name.trim(),
          // Keep tracking saves the old name as the brand, with the rename.
          brandName:
            keepBrand && values.name.trim() !== project.name
              ? project.name
              : undefined,
          domain: values.domain.trim() || undefined,
          ...values.market,
        },
      }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({
        queryKey: projectsQueryOptions().queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: ["dashboardActivation", project.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["dashboardOverview", project.id],
      });
      await queryClient.invalidateQueries({
        queryKey: aiVisibilityKey(project.id),
      });
      setKeepBrand(false);
      toast.success("Projeto atualizado");
      toastInitialAudit(saved.initialAudit);
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: project.name,
      domain: project.domain ?? "",
      market: {
        locationCode: project.locationCode,
        languageCode: project.languageCode,
      },
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: generalSchema },
    onSubmit: async ({ value, formApi }) => {
      await updateMutation.mutateAsync(value);
      // The saved values are the new baseline, so Save disables again. An edit
      // made while the save ran replaces the values object, and then the form
      // keeps that edit and Save stays on.
      if (formApi.state.values === value) formApi.reset(value);
    },
  });

  return (
    <section className="space-y-3">
      <SectionHeader title="Geral" />
      <form.AppForm>
        <form.Form className="flex flex-col gap-4">
          <form.AppField name="name">
            {(field) => (
              <field.TextField label="Nome" maxLength={120} required />
            )}
          </form.AppField>

          <form.Subscribe selector={(state) => state.values.name}>
            {(name) => (
              <BrandChangeNote
                project={project}
                name={name}
                keeping={keepBrand}
                onKeep={() => setKeepBrand(true)}
              />
            )}
          </form.Subscribe>

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
                description={
                  isEveryAppClientAuthMode()
                    ? "Cadastrar o site inicia uma auditoria de 50 páginas."
                    : "Cadastrar o site inicia uma varredura de 50 páginas com renderização de JavaScript. A renderização usa seus créditos."
                }
                placeholder="example.com"
                maxLength={255}
              />
            )}
          </form.AppField>

          <div className="flex flex-col gap-1.5">
            <form.Field name="market">
              {(field) => (
                <ProjectMarketFields
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>
            <span className="text-xs text-muted-foreground">
              Os dados de palavras, SERP e domínio usam este país e idioma, a
              menos que uma consulta peça outro.
            </span>
          </div>

          <div className="flex justify-end">
            <form.Subscribe selector={(state) => state.isDefaultValue}>
              {(isDefaultValue) => (
                <form.SubmitButton disabled={isDefaultValue}>
                  Salvar alterações
                </form.SubmitButton>
              )}
            </form.Subscribe>
          </div>
        </form.Form>
      </form.AppForm>
    </section>
  );
}

/**
 * With no brand name saved, Prompt Tracking follows the project name. This says
 * so before a rename saves, for projects it would affect.
 */
function BrandChangeNote({
  project,
  name,
  keeping,
  onKeep,
}: {
  project: ProjectSummary;
  name: string;
  keeping: boolean;
  onKeep: () => void;
}) {
  const renamed = name.trim();
  const changing =
    !project.brandName &&
    !!renamed &&
    renamed !== project.name &&
    !isDefaultProjectName(project.name) &&
    !isDefaultProjectName(renamed);
  const tracker = useQuery({
    ...aiTrackerQueryOptions(project.id),
    enabled: changing,
  });
  if (!changing || !tracker.data?.configured) return null;
  if (keeping)
    return (
      <p className="text-sm text-muted-foreground">
        Vamos continuar acompanhando “{project.name}”.
      </p>
    );
  return (
    <p className="text-sm text-muted-foreground">
      Vamos começar a procurar “{renamed}” nas buscas com IA.{" "}
      <Button
        type="button"
        variant="link"
        className="h-auto p-0"
        onClick={onKeep}
      >
        Continuar acompanhando “{project.name}”
      </Button>
    </p>
  );
}

function DangerSection({
  project,
  canArchive,
}: {
  project: ProjectSummary;
  canArchive: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const archiveMutation = useMutation({
    mutationFn: () => archiveProject({ data: { projectId: project.id } }),
    onSuccess: async () => {
      if (getLastProjectId() === project.id) clearLastProjectId();
      await queryClient.invalidateQueries({
        queryKey: projectsQueryOptions().queryKey,
      });
      toast.success("Projeto arquivado");
      // Re-resolve to a remaining project via the landing redirect.
      void navigate({ to: "/" });
    },
  });

  return (
    <section className="space-y-3 border-t border-border pt-8">
      <SectionHeader title="Arquivar projeto" />
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {canArchive
            ? "Arquivar tira o projeto da organização e para as coletas de posição agendadas. Você pode restaurá-lo depois na Carteira."
            : "Você não pode arquivar o único projeto."}
        </p>
        <div className="flex shrink-0 gap-2">
          <InlineConfirm
            label={`Arquivar ${project.name}`}
            triggerLabel="Arquivar projeto"
            confirmLabel="Sim, arquivar projeto"
            pending={archiveMutation.isPending}
            disabled={!canArchive}
            onConfirm={() => archiveMutation.mutate()}
          />
        </div>
      </div>
    </section>
  );
}
