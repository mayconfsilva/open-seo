import * as React from "react";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { findLast } from "remeda";
import { FolderCog, Plus } from "lucide-react";
import { setLastProjectId } from "@/client/lib/active-project";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/client/components/ui/combobox";
import { Button } from "@/client/components/ui/button";
import { Separator } from "@/client/components/ui/separator";
import { Skeleton } from "@/client/components/ui/skeleton";
import { LOCATIONS } from "@/shared/keyword-locations";
import type { ProjectSummary } from "./types";

const SEARCH_THRESHOLD = 5;

function matchesProject(project: ProjectSummary, query: string) {
  const needle = query.trim().toLowerCase();
  return (
    project.name.toLowerCase().includes(needle) ||
    Boolean(project.domain?.toLowerCase().includes(needle))
  );
}

function sharesDomainAcrossCountries(
  project: ProjectSummary,
  projects: ProjectSummary[],
) {
  return (
    project.domain !== null &&
    projects.some(
      (other) =>
        other.domain === project.domain &&
        other.locationCode !== project.locationCode,
    )
  );
}

export function ProjectSwitcher({
  activeProjectId,
  ready,
  onCloseDrawer,
}: {
  activeProjectId: string | null;
  /** The session is confirmed, so the projects list can load. */
  ready: boolean;
  onCloseDrawer?: () => void;
}) {
  const router = useRouter();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const projectsQuery = useQuery({ ...projectsQueryOptions(), enabled: ready });
  const projects = projectsQuery.data ?? [];
  const activeProject =
    projects.find((project) => project.id === activeProjectId) ?? null;

  if (projectsQuery.isPending) {
    // The loaded switcher's box: a name line, a domain line and the settings
    // button's slot, so nothing moves when the projects arrive.
    return (
      <div
        className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-2.5 border-t border-hairline bg-subtle py-2.5 pl-3 pr-2.5"
        aria-busy
      >
        <Skeleton className="size-8 rounded-full" />
        <div className="flex min-w-0 flex-col gap-1">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    );
  }

  const handleSelect = (project: ProjectSummary) => {
    setOpen(false);
    onCloseDrawer?.();
    if (project.draftSince) {
      void navigate({
        to: "/new-project",
        search: { project: project.id, step: 2 },
      });
      return;
    }
    if (project.id === activeProjectId) return;
    setLastProjectId(project.id);
    // Keep the current section when it exists in the new project. Detail
    // routes refer to entities in the old project and fall back to the section.
    const stayable = findLast(
      router.state.matches,
      (match) =>
        match.fullPath.includes("$projectId") &&
        match.fullPath
          .split("/")
          .every(
            (segment) => !segment.startsWith("$") || segment === "$projectId",
          ),
    );
    const template = stayable?.fullPath ?? "/p/$projectId";
    void router.navigate({
      href: template.split("$projectId").join(project.id).replace(/\/$/, ""),
    });
  };

  return (
    <>
      <Combobox
        items={projects}
        value={activeProject}
        itemToStringLabel={(project) => project.name}
        isItemEqualToValue={(project, value) => project.id === value.id}
        filter={projects.length >= SEARCH_THRESHOLD ? matchesProject : null}
        autoHighlight
        open={open}
        onOpenChange={setOpen}
        onValueChange={(project) => {
          if (project) handleSelect(project);
        }}
      >
        <ComboboxTrigger
          aria-label="Trocar projeto"
          title="Trocar projeto"
          className="relative grid w-full grid-cols-[32px_minmax(0,1fr)_16px] items-center gap-2.5 border-t border-hairline bg-subtle py-2.5 pl-3 pr-2.5 text-left hover:bg-secondary"
        >
          <span
            aria-hidden
            className="absolute -top-px left-[27px] h-2.5 w-px bg-border"
          />
          <span className="grid size-8 place-items-center rounded-full border border-border bg-accent text-xs font-bold text-primary">
            {(activeProject?.name ?? "?").charAt(0).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-col gap-px leading-tight">
            <span className="truncate text-[13.5px] font-semibold">
              {activeProject?.name ?? "Selecionar projeto"}
            </span>
            {activeProject?.domain ? (
              <span className="truncate font-mono text-[11.5px] text-muted-foreground">
                {activeProject.domain}
              </span>
            ) : null}
          </span>
        </ComboboxTrigger>
        <ComboboxContent className="w-(--anchor-width)">
          {projects.length >= SEARCH_THRESHOLD ? (
            <ComboboxInput
              className="w-auto"
              placeholder="Buscar projeto…"
              aria-label="Filtrar projetos"
              showTrigger={false}
            />
          ) : null}
          {projects.length > 0 ? (
            <ComboboxEmpty>Nenhum projeto encontrado.</ComboboxEmpty>
          ) : null}
          <ComboboxList className="max-h-[min(60vh,21rem)]">
            {(project: ProjectSummary) => (
              <ComboboxItem key={project.id} value={project}>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{project.name}</span>
                  {project.domain ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {project.domain}
                    </span>
                  ) : null}
                </span>
                {project.draftSince ? (
                  <span className="ml-auto shrink-0 rounded bg-warning/15 px-1.5 py-0.5 text-[11px] text-warning-foreground">
                    Rascunho
                  </span>
                ) : null}
                {sharesDomainAcrossCountries(project, projects) &&
                LOCATIONS[project.locationCode] ? (
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {LOCATIONS[project.locationCode]}
                  </span>
                ) : null}
              </ComboboxItem>
            )}
          </ComboboxList>
          <Separator />
          <div className="grid gap-0.5 p-1">
            <Button
              nativeButton={false}
              render={
                <Link
                  to="/new-project"
                  onClick={() => {
                    setOpen(false);
                    onCloseDrawer?.();
                  }}
                />
              }
              variant="ghost"
              className="justify-start"
            >
              <Plus className="size-4" />
              Novo projeto
            </Button>
            <Button
              nativeButton={false}
              render={
                <Link
                  to="/projects"
                  onClick={() => {
                    setOpen(false);
                    onCloseDrawer?.();
                  }}
                />
              }
              variant="ghost"
              className="justify-start"
            >
              <FolderCog className="size-4" />
              Ver carteira
            </Button>
          </div>
        </ComboboxContent>
      </Combobox>
    </>
  );
}
