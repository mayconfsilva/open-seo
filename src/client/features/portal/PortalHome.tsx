import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QueryState } from "@/client/components/QueryState";
import { getPortalProjects } from "@/serverFunctions/client-portal";
import { Delta, formatDay } from "./portalShared";

/** The projects shared with the client, one card each. */
export function PortalHome() {
  const projects = useQuery({
    queryKey: ["portal", "projects"],
    queryFn: () => getPortalProjects(),
  });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-[24px] font-semibold tracking-[-.01em]">
          Seus projetos
        </h1>
        <p className="text-[13.5px] text-muted-foreground">
          Posições no Google, concorrentes e o plano de ação de cada site.
        </p>
      </div>
      <QueryState query={projects} errorFallback="Não foi possível carregar">
        {(list) =>
          list.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-card px-5 py-10 text-center text-[13.5px] text-muted-foreground">
              Nenhum projeto foi liberado para você ainda. Fale com a agência
              que te convidou.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((project) => (
                <Link
                  key={project.id}
                  to="/portal/$projectId"
                  params={{ projectId: project.id }}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 hover:border-primary"
                >
                  <span className="flex flex-col">
                    <span className="font-semibold">{project.name}</span>
                    <span className="font-mono text-[12px] text-muted-foreground">
                      {project.domain}
                    </span>
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="text-[22px] font-semibold tabular-nums">
                      {project.top10}
                    </span>
                    <span className="text-[12.5px] text-muted-foreground">
                      de {project.keywords} palavra(s) no top 10
                    </span>
                    <Delta value={project.top10 - project.prevTop10} />
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    {project.lastCheckedAt
                      ? `Última coleta em ${formatDay(project.lastCheckedAt)}`
                      : "Aguardando a primeira coleta"}
                  </span>
                </Link>
              ))}
            </div>
          )
        }
      </QueryState>
    </div>
  );
}
