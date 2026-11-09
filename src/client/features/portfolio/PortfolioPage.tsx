import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sortBy } from "remeda";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  FolderPlus,
  Plus,
} from "lucide-react";
import { cn } from "cn";
import { QueryState } from "@/client/components/QueryState";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { getPortfolio } from "@/serverFunctions/portfolio";

type PortfolioProject = Awaited<ReturnType<typeof getPortfolio>>[number];

/** Days without a check before a project shows up as needing attention. */
const STALE_DAYS = 14;

/** Board 4a: every project of the organization on one screen. */
export function PortfolioPage() {
  const portfolio = useQuery({
    queryKey: ["projects", "portfolio"],
    queryFn: () => getPortfolio(),
  });
  return (
    <QueryState query={portfolio} errorFallback="Não foi possível carregar">
      {(projects) => {
        // Every organization keeps one project; the automatic placeholder
        // (no site, nothing tracked) is shown as the empty organization (4d).
        const real = projects.filter(
          (project) => project.domain !== null || project.keywords > 0,
        );
        if (real.length === 0) return <EmptyOrganization />;
        return <Portfolio projects={real} />;
      }}
    </QueryState>
  );
}

function Portfolio({ projects }: { projects: PortfolioProject[] }) {
  const active = projects.filter((project) => !project.draft);
  const top10 = active.reduce((sum, project) => sum + project.top10, 0);
  const prevTop10 = active.reduce((sum, project) => sum + project.prevTop10, 0);
  const openTasks = active.reduce((sum, project) => sum + project.openTasks, 0);
  const drafts = projects.length - active.length;
  const attention = attentionItems(projects);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[24px] font-semibold tracking-[-.01em]">
            Carteira
          </h1>
          <p className="text-[13.5px] text-muted-foreground">
            Todos os sites que você acompanha, com o que mudou desde a coleta
            anterior.
          </p>
        </div>
        <Button render={<Link to="/new-project" />} nativeButton={false}>
          <Plus data-icon="inline-start" />
          Adicionar projeto
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Projetos ativos" value={active.length} />
        <Stat
          label="Palavras no top 10"
          value={top10}
          delta={top10 - prevTop10}
        />
        <Stat label="Tarefas abertas" value={openTasks} />
        <Stat label="Rascunhos" value={drafts} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11.5px] font-semibold tracking-[.04em] text-muted-foreground uppercase">
                <th className="px-4 py-2.5">Projeto</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Top 10</th>
                <th className="px-3 py-2.5 text-right">Tarefas</th>
                <th className="px-4 py-2.5 text-right">Última coleta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortBy(projects, (project) => project.name).map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </tbody>
          </table>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold">
            O que precisa da sua atenção
          </h2>
          {attention.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Nada urgente. Nenhuma palavra saiu do top 10 na última coleta.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {attention.map((item) => (
                <li key={item.key} className="flex gap-2.5 text-[13px]">
                  <AlertTriangle
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      item.tone === "bad" ? "text-destructive" : "text-warning",
                    )}
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium">{item.project.name}</span>
                    <span className="text-muted-foreground">{item.text}</span>
                    <ProjectLink
                      project={item.project}
                      className="text-[12.5px] text-primary hover:underline"
                    >
                      {item.project.draft ? "Continuar cadastro" : "Abrir"}
                    </ProjectLink>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function ProjectRow({ project }: { project: PortfolioProject }) {
  const delta = project.top10 - project.prevTop10;
  return (
    <tr className="hover:bg-muted/40">
      <td className="px-4 py-2.5">
        <ProjectLink project={project} className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{project.name}</span>
          <span className="truncate font-mono text-[11.5px] text-muted-foreground">
            {project.domain}
          </span>
        </ProjectLink>
      </td>
      <td className="px-3 py-2.5">
        {project.draft ? (
          <Badge variant="warning" size="sm">
            Rascunho
          </Badge>
        ) : (
          <Badge variant="success" size="sm">
            Ativo
          </Badge>
        )}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {project.draft ? (
          "—"
        ) : (
          <span className="inline-flex items-center gap-1.5">
            {project.top10}
            <span className="text-muted-foreground">/ {project.keywords}</span>
            <Delta value={delta} />
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {project.openTasks}
      </td>
      <td className="px-4 py-2.5 text-right text-muted-foreground">
        {project.lastCheckedAt ? formatDate(project.lastCheckedAt) : "—"}
      </td>
    </tr>
  );
}

function ProjectLink({
  project,
  className,
  children,
}: {
  project: PortfolioProject;
  className?: string;
  children: React.ReactNode;
}) {
  return project.draft ? (
    <Link
      to="/new-project"
      search={{ project: project.id, step: 2 }}
      className={className}
    >
      {children}
    </Link>
  ) : (
    <Link
      to="/p/$projectId"
      params={{ projectId: project.id }}
      className={className}
    >
      {children}
    </Link>
  );
}

function Stat({
  label,
  value,
  delta,
}: {
  label: string;
  value: number;
  delta?: number;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 text-[22px] font-semibold tabular-nums">
        {value}
        {delta === undefined ? null : <Delta value={delta} />}
      </span>
    </div>
  );
}

function Delta({ value }: { value: number }) {
  if (value === 0) return null;
  const Icon = value > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center text-[12px] font-medium",
        value > 0 ? "text-success" : "text-destructive",
      )}
    >
      <Icon className="size-3" />
      {Math.abs(value)}
    </span>
  );
}

function attentionItems(projects: PortfolioProject[]) {
  const staleBefore = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
  return projects.flatMap((project) => {
    const items: Array<{
      key: string;
      project: PortfolioProject;
      text: string;
      tone: "bad" | "warn";
    }> = [];
    if (project.draft) {
      items.push({
        key: `${project.id}:draft`,
        project,
        tone: "warn",
        text: "Cadastro não concluído. Nada é coletado até a revisão final.",
      });
      return items;
    }
    if (project.runStatus === "failed") {
      items.push({
        key: `${project.id}:failed`,
        project,
        tone: "bad",
        text: "A última coleta falhou.",
      });
    }
    if (project.droppedCount > 0) {
      const names = project.dropped.map((kw) => `«${kw}»`).join(", ");
      const more = project.droppedCount - project.dropped.length;
      items.push({
        key: `${project.id}:dropped`,
        project,
        tone: "bad",
        text: `${project.droppedCount} palavra(s) saíram do top 10: ${names}${more > 0 ? ` e mais ${more}` : ""}.`,
      });
    }
    if (
      project.lastCheckedAt &&
      new Date(project.lastCheckedAt).getTime() < staleBefore
    ) {
      items.push({
        key: `${project.id}:stale`,
        project,
        tone: "warn",
        text: `Sem coleta há mais de ${STALE_DAYS} dias.`,
      });
    }
    return items;
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

/** Board 4d: an organization that has no site yet. */
function EmptyOrganization() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-accent text-primary">
        <FolderPlus className="size-6" />
      </span>
      <h1 className="text-[20px] font-semibold">Nenhum site por aqui ainda</h1>
      <p className="text-[13.5px] text-muted-foreground">
        Cadastre o primeiro projeto em 6 etapas: site, mercado, fontes,
        palavras-chave, concorrentes e revisão. Fica salvo como rascunho, e nada
        é coletado antes da revisão final.
      </p>
      <Button render={<Link to="/new-project" />} nativeButton={false}>
        <Plus data-icon="inline-start" />
        Cadastrar o primeiro projeto
      </Button>
    </div>
  );
}
