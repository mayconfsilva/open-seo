import * as React from "react";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deleteArchivedProject,
  getArchivedProjects,
  restoreProject,
} from "@/serverFunctions/projects";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { SectionHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { PortfolioPage } from "@/client/features/portfolio/PortfolioPage";
import { pageHead } from "@/client/lib/pageHead";

export const Route = createFileRoute("/_app/projects")({
  head: () => pageHead("Carteira"),
  component: ProjectsPage,
});

function ProjectsPage() {
  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PortfolioPage />
        <ArchivedProjects />
      </div>
    </div>
  );
}

function ArchivedProjects() {
  const queryClient = useQueryClient();
  const archivedQuery = useQuery({
    queryKey: ["projects", "archived"],
    queryFn: () => getArchivedProjects(),
  });
  const archived = archivedQuery.data ?? [];

  const restoreMutation = useMutation({
    mutationFn: (projectId: string) =>
      restoreProject({ data: { archivedProjectId: projectId } }),
    onSuccess: async () => {
      // Prefix match invalidates both the active and archived lists.
      await queryClient.invalidateQueries({
        queryKey: projectsQueryOptions().queryKey,
      });
      toast.success("Projeto restaurado");
    },
  });

  const [deleting, setDeleting] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (projectId: string) =>
      deleteArchivedProject({ data: { archivedProjectId: projectId } }),
    onSuccess: async () => {
      setDeleting(null);
      await queryClient.invalidateQueries({
        queryKey: ["projects", "archived"],
      });
      toast.success("Projeto excluído");
    },
  });

  if (archived.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionHeader title="Arquivados" />
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {archived.map((project) => (
          <li
            key={project.id}
            className="flex items-center justify-between gap-3 p-3"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-muted-foreground">
                {project.name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {project.domain ?? "Sem domínio"}
              </span>
            </span>
            <span className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => restoreMutation.mutate(project.id)}
                disabled={restoreMutation.isPending}
              >
                Restaurar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleting(project)}
              >
                Excluir
              </Button>
            </span>
          </li>
        ))}
      </ul>
      {deleting ? (
        <ConfirmDialog
          title={`Excluir \u201c${deleting.name}\u201d para sempre?`}
          confirmLabel="Excluir para sempre"
          destructive
          pending={deleteMutation.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => deleteMutation.mutate(deleting.id)}
        >
          Isso apaga o projeto e todos os dados dele: auditorias, posições,
          palavras salvas, relatórios, visibilidade em IA e conversas. Não dá
          para desfazer.
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
