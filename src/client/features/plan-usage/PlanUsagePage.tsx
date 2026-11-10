import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { QueryError, QueryState } from "@/client/components/QueryState";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Badge } from "@/client/components/ui/badge";
import { organizationContextQueryOptions } from "@/client/features/team/organizationQueries";
import { hasOrgPermission } from "@/lib/org-permissions";
import {
  PlanMeter,
  dataforseoBalanceQueryOptions,
  formatUsd,
  formatPlanDate,
  formatPlanDay,
  formatQueries,
  planUsageQueryOptions,
  usedPercent,
  type PlanUsage,
} from "./planUsage";

const SCHEDULE_LABELS = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  manual: "Manual",
} as const;

/** The organization's plan usage: this month, per project and the last months. */
export function PlanUsagePage() {
  const usage = useQuery(planUsageQueryOptions());
  return (
    <QueryState
      query={usage}
      errorFallback="Não foi possível carregar o consumo"
    >
      {(data) => <PlanUsageContent usage={data} />}
    </QueryState>
  );
}

function PlanUsageContent({ usage }: { usage: PlanUsage }) {
  const quota = usage.plan.monthlyQueries;
  const projected = usage.used + usage.upcoming;
  const available = Math.max(0, quota - usage.used);
  const overBy = projected - quota;
  const monthName = formatPlanDate(usage.monthStart, { month: "long" });
  const renewsOn = formatPlanDay(usage.renewsAt);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-[24px] font-semibold tracking-[-.01em]">
          Consumo do plano
        </h1>
        <p className="text-[13.5px] text-muted-foreground">
          Consultas usadas pela organização em {monthName}. Uso do plano, não
          valor a pagar.
        </p>
      </div>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold">{usage.plan.name}</h2>
          <span className="text-[12.5px] text-muted-foreground">
            Renova em {renewsOn}
          </span>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[28px] font-semibold tabular-nums">
            {formatQueries(usage.used)}
          </span>
          <span className="text-[14px] text-muted-foreground">
            de {formatQueries(quota)} consultas · {usedPercent(usage)}% usado
          </span>
        </div>
        <PlanMeter usage={usage} segments={40} />
        <dl className="grid gap-3 text-[13px] sm:grid-cols-3">
          <Figure
            swatch="bg-(--rank-1)"
            label="Usado no mês"
            value={usage.used}
          />
          <Figure
            swatch="bg-(--rank-2)"
            label="Previsto até renovar"
            value={usage.upcoming}
            note="Coletas agendadas que ainda vão rodar"
          />
          <Figure
            swatch="bg-track"
            label="Disponível agora"
            value={available}
          />
        </dl>
        {overBy > 0 ? (
          <Alert variant="warning">
            <AlertTriangle />
            <AlertDescription>
              Com as coletas agendadas, a franquia de {monthName} seria
              ultrapassada em {formatQueries(overBy)} consultas. Reduza a
              frequência ou as palavras de algum projeto para ficar dentro.
            </AlertDescription>
          </Alert>
        ) : null}
        <p className="text-[12px] text-muted-foreground">
          Cada palavra em cada dispositivo conta uma consulta por coleta.
          Coletas que falham não consomem franquia. Por enquanto, só as coletas
          de posição entram nesta conta.
        </p>
      </section>

      <DataforseoBalance />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ProjectsTable usage={usage} />
        <History usage={usage} />
      </div>
    </div>
  );
}

/** The money left on the DataForSEO account, for owners and admins. */
function DataforseoBalance() {
  const org = useQuery(organizationContextQueryOptions());
  const canSee =
    org.data !== undefined &&
    hasOrgPermission(org.data.role, { integration: ["manage"] });
  const balance = useQuery({
    ...dataforseoBalanceQueryOptions(),
    enabled: canSee,
  });
  if (!canSee) return null;

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold">Saldo na DataForSEO</h2>
        {balance.data ? (
          <span className="text-[12.5px] text-muted-foreground">
            Consultado às{" "}
            {new Date(balance.data.checkedAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ) : null}
      </div>
      {balance.isError ? (
        <QueryError
          fallback="Não foi possível consultar o saldo agora. Confira a chave da DataForSEO."
          onRetry={() => void balance.refetch()}
          isRetrying={balance.isFetching}
        />
      ) : (
        <span className="text-[28px] font-semibold tabular-nums">
          {balance.data
            ? balance.data.balanceUsd === null
              ? "—"
              : formatUsd(balance.data.balanceUsd)
            : "…"}
        </span>
      )}
      <p className="text-[12px] text-muted-foreground">
        Crédito que ainda resta na conta da DataForSEO usada por esta
        instalação. As recargas são feitas no painel da DataForSEO.
      </p>
    </section>
  );
}

function Figure({
  swatch,
  label,
  value,
  note,
}: {
  swatch: string;
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        <span className={`size-2.5 rounded-[2px] ${swatch}`} aria-hidden />
        {label}
      </dt>
      <dd className="text-[18px] font-semibold tabular-nums">
        {formatQueries(value)}
      </dd>
      {note ? (
        <dd className="text-[12px] text-muted-foreground">{note}</dd>
      ) : null}
    </div>
  );
}

function ProjectsTable({ usage }: { usage: PlanUsage }) {
  const quota = usage.plan.monthlyQueries;
  return (
    <section className="overflow-x-auto rounded-lg border border-border bg-card">
      <h2 className="px-4 pt-4 pb-2 text-[15px] font-semibold">Por projeto</h2>
      {usage.projects.length === 0 ? (
        <p className="px-4 pb-4 text-[13px] text-muted-foreground">
          Nenhum projeto acompanha palavras ainda, então nada foi consumido.
        </p>
      ) : (
        <table className="w-full min-w-[600px] text-[13px]">
          <thead>
            <tr className="border-y border-border text-left text-[11.5px] font-semibold tracking-[.04em] text-muted-foreground uppercase">
              <th className="px-4 py-2.5">Projeto</th>
              <th className="px-3 py-2.5">Coleta</th>
              <th className="px-3 py-2.5 text-right">Por coleta</th>
              <th className="px-3 py-2.5 text-right">Usado</th>
              <th className="px-3 py-2.5 text-right">Previsto</th>
              <th className="px-4 py-2.5 text-right">Da franquia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {usage.projects.map((project) => (
              <tr key={project.id} className="hover:bg-muted/40">
                <td className="px-4 py-2.5">
                  <span className="flex min-w-0 flex-col">
                    {project.archived ? (
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium text-muted-foreground">
                          {project.name}
                        </span>
                        <Badge variant="secondary" size="sm">
                          Arquivado
                        </Badge>
                      </span>
                    ) : (
                      <Link
                        to="/p/$projectId/rank-tracking"
                        params={{ projectId: project.id }}
                        className="truncate font-medium hover:underline"
                      >
                        {project.name}
                      </Link>
                    )}
                    <span className="truncate font-mono text-[11.5px] text-muted-foreground">
                      {project.domain}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {project.archived
                    ? "—"
                    : SCHEDULE_LABELS[project.scheduleInterval]}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {project.archived
                    ? "—"
                    : formatQueries(project.queriesPerCheck)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatQueries(project.used)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {project.upcoming > 0
                    ? `+${formatQueries(project.upcoming)}`
                    : "—"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {Math.round(
                    ((project.used + project.upcoming) / quota) * 100,
                  )}
                  %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function History({ usage }: { usage: PlanUsage }) {
  const quota = usage.plan.monthlyQueries;
  const top = Math.max(quota, ...usage.history.map((month) => month.used));
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
      <h2 className="text-[15px] font-semibold">Últimos meses</h2>
      <ul className="flex flex-col gap-2.5">
        {usage.history.map((month, i) => {
          const current = i === usage.history.length - 1;
          return (
            <li key={month.month} className="flex flex-col gap-1 text-[13px]">
              <span className="flex justify-between gap-2">
                <span
                  className={current ? "font-medium" : "text-muted-foreground"}
                >
                  {formatPlanDate(month.month, {
                    month: "long",
                    year: "numeric",
                  })}
                  {current ? " · atual" : ""}
                </span>
                <span className="tabular-nums">
                  {formatQueries(month.used)}
                </span>
              </span>
              <span className="h-1.5 overflow-hidden rounded-[2px] bg-track">
                <span
                  className="block h-full bg-(--rank-1)"
                  style={{ width: `${(month.used / top) * 100}%` }}
                />
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-[12px] text-muted-foreground">
        Franquia de {formatQueries(quota)} consultas por mês.
      </p>
    </section>
  );
}
