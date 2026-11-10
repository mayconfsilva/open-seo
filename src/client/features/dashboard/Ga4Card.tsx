import { CardShell } from "@/client/components/CardShell";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  cardMetaClass,
  moreDetailsClass,
} from "@/client/features/dashboard/cardParts";
import {
  MetricRow,
  MetricsSkeleton,
  TrendChart,
} from "@/client/features/dashboard/DashboardMetrics";
import { percentChange } from "@/client/components/MetricsTable";
import { Ga4ConnectCard } from "@/client/features/dashboard/Ga4ConnectCard";
import {
  formatCount,
  formatCtr,
} from "@/client/features/search-performance/SearchPerformanceColumns";
import { GoogleAnalyticsLogo } from "@/client/features/integrations/GoogleProductLogos";
import { getGa4DashboardReport } from "@/serverFunctions/ga4";
import type { ChartConfig } from "@/client/components/ui/chart";

const sessionsChartConfig = {
  sessions: { label: "Sessões", color: "var(--chart-1)" },
} satisfies ChartConfig;

function statValue(
  value: number | null,
  format: (value: number) => string,
): string {
  return value === null ? "—" : format(value);
}

export function Ga4Card({
  projectId,
  connected,
}: {
  projectId: string;
  connected: boolean;
}) {
  const reportQuery = useQuery({
    queryKey: ["dashboardGa4Report", projectId],
    queryFn: () => getGa4DashboardReport({ data: { projectId } }),
    enabled: connected,
  });
  const report = reportQuery.data;

  // Not connected (or a dead grant discovered by the report call): the
  // connection card sells and runs the whole flow itself.
  if (!connected || (report && !report.connected)) {
    return <Ga4ConnectCard projectId={projectId} connected={connected} />;
  }

  // The empty state covers null sessions (no report row) and 0: a zero-session
  // period would otherwise render an all-zero flatline chart in an empty box.
  return (
    <CardShell
      title="Google Analytics"
      icon={<GoogleAnalyticsLogo className="size-5" />}
      titleInfo={
        <span className={cardMetaClass}>Busca orgânica · Últimos 28 dias</span>
      }
      action={
        <Link
          to="/p/$projectId/settings"
          params={{ projectId }}
          hash="google-analytics"
          className={moreDetailsClass}
        >
          Gerenciar
        </Link>
      }
    >
      {reportQuery.isError ? (
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar os dados do Google Analytics. Tente de novo
          daqui a pouco.
        </p>
      ) : !report ? (
        <MetricsSkeleton />
      ) : !report.totals.sessions ? (
        <p className="text-sm text-muted-foreground">
          Nenhum tráfego orgânico registrado nos últimos 28 dias.
        </p>
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          <MetricRow
            metrics={[
              {
                label: "Sessões",
                value: statValue(report.totals.sessions, formatCount),
                change: percentChange(
                  report.totals.sessions,
                  report.prevTotals.sessions,
                ),
                dotClass: "bg-chart-1",
              },
              {
                label: "Usuários ativos",
                value: statValue(report.totals.activeUsers, formatCount),
                change: percentChange(
                  report.totals.activeUsers,
                  report.prevTotals.activeUsers,
                ),
              },
              {
                label: "Taxa de engajamento",
                value: statValue(report.totals.engagementRate, formatCtr),
                change: null,
              },
              {
                label: "Eventos principais",
                value: statValue(report.totals.keyEvents, formatCount),
                change: percentChange(
                  report.totals.keyEvents,
                  report.prevTotals.keyEvents,
                ),
              },
            ]}
          />
          <TrendChart config={sessionsChartConfig} data={report.trend} />
        </div>
      )}
    </CardShell>
  );
}
