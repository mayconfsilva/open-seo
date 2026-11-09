import { Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { sortBy } from "remeda";
import { Button } from "@/client/components/ui/button";
import { Skeleton } from "@/client/components/ui/skeleton";
import { QueryError } from "@/client/components/QueryState";
import {
  getLatestRankResults,
  getRankConfigTrend,
  getRankTrackingConfigs,
} from "@/serverFunctions/rank-tracking";
import type { RankTrackingRow } from "@/types/schemas/rank-tracking";
import {
  CompetitorsTop10,
  KpiCard,
  MoversCard,
  PositionBandsChart,
  SummaryCard,
  type Mover,
} from "./RankSummaryParts";

type Device = "desktop" | "mobile";

/**
 * dataSEO "Resumo" (visual direction v2, board 3a): the monitored keywords of
 * the project's own domain, built from the rank tracker whose domain matches
 * the project. Every other tracker in the project counts as a competitor.
 */
export function RankSummary({
  projectId,
  domain,
}: {
  projectId: string;
  domain: string | null;
}) {
  const configsQuery = useQuery({
    queryKey: ["rankTrackingConfigs", projectId],
    queryFn: () => getRankTrackingConfigs({ data: { projectId } }),
  });

  if (configsQuery.isPending) return <RankSummarySkeleton />;
  if (configsQuery.isError) {
    return (
      <QueryError
        error={configsQuery.error}
        fallback="Não foi possível carregar o acompanhamento de palavras"
        onRetry={() => void configsQuery.refetch()}
        isRetrying={configsQuery.isFetching}
      />
    );
  }

  const configs = configsQuery.data;
  const main =
    configs.find((config) => domain && config.domain === domain) ?? configs[0];
  if (!main) return <NoTrackingCard projectId={projectId} />;

  return (
    <RankSummaryContent
      projectId={projectId}
      main={main}
      competitors={configs.filter((config) => config.id !== main.id)}
    />
  );
}

type Config = Awaited<ReturnType<typeof getRankTrackingConfigs>>[number];

function RankSummaryContent({
  projectId,
  main,
  competitors,
}: {
  projectId: string;
  main: Config;
  competitors: Config[];
}) {
  const device: Device = main.devices === "desktop" ? "desktop" : "mobile";
  const trendQuery = useQuery({
    queryKey: ["rankConfigTrend", projectId, main.id, device, 90],
    queryFn: () =>
      getRankConfigTrend({
        data: { projectId, configId: main.id, device, sinceDays: 90 },
      }),
  });
  const latestQueries = useQueries({
    queries: [main, ...competitors].map((config) => ({
      queryKey: ["rankLatestResults", projectId, config.id, "90d"],
      queryFn: () =>
        getLatestRankResults({
          data: { projectId, configId: config.id, comparePeriod: "90d" },
        }),
    })),
  });
  const mainLatest = latestQueries[0];

  if (trendQuery.isPending || mainLatest?.isPending) {
    return <RankSummarySkeleton />;
  }
  if (trendQuery.isError || !mainLatest || mainLatest.isError) {
    return (
      <QueryError
        error={trendQuery.error ?? mainLatest?.error}
        fallback="Não foi possível carregar o resumo de posições"
        onRetry={() => {
          void trendQuery.refetch();
          void mainLatest?.refetch();
        }}
        isRetrying={trendQuery.isFetching}
      />
    );
  }

  const rows = mainLatest.data.rows;
  const stats = summarize(rows, device);
  const lastCheckedAt = mainLatest.data.run?.lastCheckedAt ?? null;
  const competitorCounts = competitors.map((config, index) => {
    const data = latestQueries[index + 1]?.data;
    return {
      name: config.domain,
      value: data ? countTop10(data.rows, device) : null,
    };
  });

  return (
    <section aria-label="Resumo das posições" className="flex flex-col gap-4">
      <p className="text-[13px] text-muted-foreground">
        {lastCheckedAt
          ? `Última coleta em ${formatDateTime(lastCheckedAt)}`
          : "Aguardando a primeira coleta"}{" "}
        · {rows.length} palavras · {competitors.length} concorrentes ·{" "}
        {device === "mobile" ? "Celular" : "Computador"}
      </p>

      <SummaryCard text={summaryText(stats)} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="No top 3"
          value={stats.top3}
          delta={stats.top3 - stats.prevTop3}
          note={`de ${stats.checked} com posição medida`}
        />
        <KpiCard
          label="No top 10"
          value={stats.top10}
          delta={stats.top10 - stats.prevTop10}
          note={`de ${stats.checked} com posição medida`}
        />
        <KpiCard
          label="Posição média"
          value={stats.average === null ? "—" : stats.average.toFixed(1)}
          note="só palavras encontradas · 1 = melhor"
        />
        <KpiCard
          label="Não encontradas"
          value={stats.notFound}
          note="fora das posições coletadas"
        />
      </div>

      <PositionBandsChart points={trendQuery.data} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MoversCard projectId={projectId} up={stats.up} down={stats.down} />
        </div>
        <CompetitorsTop10
          projectId={projectId}
          you={{ name: main.domain, value: stats.top10 }}
          competitors={competitorCounts}
          base={stats.checked}
        />
      </div>
    </section>
  );
}

function summarize(rows: RankTrackingRow[], device: Device) {
  let top3 = 0;
  let top10 = 0;
  let prevTop3 = 0;
  let prevTop10 = 0;
  let checked = 0;
  let notFound = 0;
  let positionSum = 0;
  let positionCount = 0;
  const movers: Mover[] = [];
  for (const row of rows) {
    const result = row[device];
    if (!result.checkedAt) continue;
    checked += 1;
    const { position, previousPosition } = result;
    if (position === null) notFound += 1;
    else {
      positionSum += position;
      positionCount += 1;
      if (position <= 3) top3 += 1;
      if (position <= 10) top10 += 1;
    }
    if (previousPosition !== null && previousPosition <= 3) prevTop3 += 1;
    if (previousPosition !== null && previousPosition <= 10) prevTop10 += 1;
    if (position !== null && previousPosition !== null) {
      if (position !== previousPosition) {
        movers.push({
          keyword: row.keyword,
          from: previousPosition,
          to: position,
        });
      }
    }
  }
  // Gain = places moved toward 1st; largest first.
  const byGain = sortBy(movers, [(m) => m.from - m.to, "desc"]);
  return {
    top3,
    top10,
    prevTop3,
    prevTop10,
    checked,
    notFound,
    average: positionCount ? positionSum / positionCount : null,
    up: byGain.filter((m) => m.to < m.from).slice(0, 5),
    down: sortBy(
      byGain.filter((m) => m.to > m.from),
      (m) => m.from - m.to,
    ).slice(0, 5),
  };
}

function summaryText(stats: ReturnType<typeof summarize>) {
  if (stats.checked === 0) {
    return "Ainda não há coletas com resultado. O resumo aparece depois da primeira coleta.";
  }
  const diff = stats.top10 - stats.prevTop10;
  const change =
    diff > 0
      ? `${diff} a mais que há 90 dias`
      : diff < 0
        ? `${-diff} a menos que há 90 dias`
        : "o mesmo número de 90 dias atrás";
  const parts = [
    `${stats.top10} de ${stats.checked} palavras estão nas 10 primeiras posições, ${change}.`,
  ];
  const worst = stats.down[0];
  if (worst) {
    parts.push(
      `A maior queda foi em «${worst.keyword}», da ${worst.from}ª para a ${worst.to}ª posição.`,
    );
  }
  const best = stats.up[0];
  if (best) {
    parts.push(
      `A maior subida foi em «${best.keyword}», da ${best.from}ª para a ${best.to}ª.`,
    );
  }
  return parts.join(" ");
}

function countTop10(rows: RankTrackingRow[], device: Device) {
  return rows.filter((row) => {
    const position = row[device].position;
    return position !== null && position <= 10;
  }).length;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NoTrackingCard({ projectId }: { projectId: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border bg-card p-5">
      <span className="grid size-9 place-items-center rounded-md bg-accent text-primary">
        <TrendingUp className="size-4" />
      </span>
      <div>
        <h2 className="text-base font-semibold">
          Comece a acompanhar suas palavras
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre as buscas que importam para o seu site. O resumo mostra as
          posições, quem subiu e quem caiu a cada coleta.
        </p>
      </div>
      <Button
        nativeButton={false}
        render={
          <Link to="/p/$projectId/rank-tracking" params={{ projectId }} />
        }
      >
        Adicionar palavras
      </Button>
    </div>
  );
}

function RankSummarySkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
