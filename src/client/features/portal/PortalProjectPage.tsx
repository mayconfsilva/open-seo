import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sortBy } from "remeda";
import { ArrowLeft } from "lucide-react";
import { QueryState } from "@/client/components/QueryState";
import { Badge } from "@/client/components/ui/badge";
import { getPortalProject } from "@/serverFunctions/client-portal";
import { Delta, formatDay } from "./portalShared";

type PortalProject = Awaited<ReturnType<typeof getPortalProject>>;

const STATUS: Record<PortalProject["tasks"][number]["status"], string> = {
  todo: "A fazer",
  doing: "Em andamento",
  done: "Concluída",
};

/** One shared project, read-only (dataSEO access phase). */
export function PortalProjectPage({ projectId }: { projectId: string }) {
  const query = useQuery({
    queryKey: ["portal", "project", projectId],
    queryFn: () => getPortalProject({ data: { projectId } }),
    retry: false,
  });
  return (
    <QueryState query={query} errorFallback="Projeto não encontrado">
      {(data) => <ProjectView data={data} />}
    </QueryState>
  );
}

function ProjectView({ data }: { data: PortalProject }) {
  const found = data.keywords.filter((kw) => kw.position !== null);
  const top10 = found.filter((kw) => (kw.position ?? 99) <= 10).length;
  const prevTop10 = data.keywords.filter(
    (kw) => kw.previousPosition !== null && kw.previousPosition <= 10,
  ).length;
  const keywords = sortBy(data.keywords, (kw) => kw.position ?? 999);

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/portal"
        className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Seus projetos
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-[24px] font-semibold tracking-[-.01em]">
          {data.project.name}
        </h1>
        <p className="font-mono text-[13px] text-muted-foreground">
          {data.project.domain}
          {data.lastCheckedAt
            ? ` · última coleta em ${formatDay(data.lastCheckedAt)}`
            : ""}
          {data.device
            ? ` · ${data.device === "mobile" ? "celular" : "computador"}`
            : ""}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="No top 10" value={top10} delta={top10 - prevTop10} />
        <Stat label="Palavras acompanhadas" value={data.keywords.length} />
        <Stat
          label="Tarefas em andamento"
          value={data.tasks.filter((task) => task.status !== "done").length}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[480px] text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11.5px] font-semibold tracking-[.04em] text-muted-foreground uppercase">
                <th className="px-4 py-2.5">Palavra</th>
                <th className="px-3 py-2.5 text-right">Posição</th>
                <th className="px-4 py-2.5">Página</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keywords.map((kw) => (
                <tr key={kw.id}>
                  <td className="px-4 py-2">{kw.keyword}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      {kw.position ?? "—"}
                      {kw.position !== null && kw.previousPosition !== null ? (
                        <Delta value={kw.previousPosition - kw.position} />
                      ) : null}
                    </span>
                  </td>
                  <td className="max-w-56 truncate px-4 py-2 font-mono text-[11.5px] text-muted-foreground">
                    {kw.url ? pathOf(kw.url) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {keywords.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
              Ainda não há palavras com coleta.
            </p>
          ) : null}
        </section>

        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5">
            <h2 className="text-[15px] font-semibold">
              Concorrentes no top 10
            </h2>
            {data.competitors.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Nenhum concorrente cadastrado.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-[13px]">
                <li className="flex justify-between font-semibold">
                  <span className="font-mono">
                    {data.project.domain} (você)
                  </span>
                  <span className="tabular-nums">{top10}</span>
                </li>
                {sortBy(data.competitors, [(c) => c.top10, "desc"]).map(
                  (competitor) => (
                    <li
                      key={competitor.domain}
                      className="flex justify-between"
                    >
                      <span className="font-mono">{competitor.domain}</span>
                      <span className="tabular-nums">{competitor.top10}</span>
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>
          <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5">
            <h2 className="text-[15px] font-semibold">Plano de ação</h2>
            {data.tasks.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                A agência ainda não registrou tarefas.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5 text-[13px]">
                {data.tasks.map((task) => (
                  <li key={task.id} className="flex flex-col gap-0.5">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-medium">{task.title}</span>
                      <Badge
                        size="sm"
                        variant={task.status === "done" ? "success" : "outline"}
                      >
                        {STATUS[task.status]}
                      </Badge>
                    </span>
                    {task.reason ? (
                      <span className="text-muted-foreground">
                        {task.reason}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
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

function pathOf(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
