import { Link } from "@tanstack/react-router";
import { Button } from "@/client/components/ui/button";
import { getSearchPerformanceReport } from "@/serverFunctions/searchPerformance";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TabsTrigger } from "@/client/components/ui/tabs";
import { DataTableTabs } from "@/client/components/table/DataTableToolbar";
import { QueryError } from "@/client/components/QueryState";
import { GoogleConnectionCard } from "@/client/features/integrations/GoogleConnectionCard";
import {
  getDashboardEmergingQueries,
  getDashboardKeywords,
} from "@/serverFunctions/dashboard";
import { DashboardKeywordTable } from "./DashboardKeywordTable";
import { Freshness } from "./siteTabParts";

const SOURCES = ["new", "top", "striking"] as const;
type Source = (typeof SOURCES)[number];

const DESCRIPTIONS: Record<Source, string> = {
  new: "Buscas em que seu site apareceu na última semana do Search Console, mas não nas quatro anteriores.",
  top: "Buscas que mais trouxeram cliques ao seu site nos últimos 28 dias.",
  striking:
    "Palavras nas posições 5 a 20 nos últimos 28 dias. Melhorar a página indicada pode ajudá-las a subir.",
};

export function DashboardKeywords({
  projectId,
  connected,
  siteUrl,
}: {
  projectId: string;
  connected: boolean;
  siteUrl: string | null;
}) {
  const [source, setSource] = useState<Source>("new");
  const emerging = useQuery({
    queryKey: ["dashboardEmergingQueries", projectId, siteUrl],
    queryFn: () => getDashboardEmergingQueries({ data: { projectId } }),
    enabled: connected && source === "new",
    staleTime: 10 * 60_000,
    retry: false,
  });
  const keywords = useQuery({
    queryKey: ["dashboardGscKeywords", projectId, siteUrl],
    queryFn: () => getDashboardKeywords({ data: { projectId } }),
    enabled: connected && source === "top",
    staleTime: 10 * 60_000,
    retry: false,
  });
  const striking = useQuery({
    queryKey: ["dashboardGscReport", projectId, siteUrl, "last_28_days"],
    queryFn: () =>
      getSearchPerformanceReport({
        data: { projectId, dateRange: "last_28_days" },
      }),
    enabled: connected && source === "striking",
    staleTime: 10 * 60_000,
  });
  if (!connected)
    return (
      <GoogleConnectionCard provider="gsc" projectId={projectId} prominent />
    );

  const query =
    source === "new" ? emerging : source === "top" ? keywords : striking;
  const cached =
    source === "new" ? emerging.data : source === "top" ? keywords.data : null;
  const result =
    source === "striking"
      ? striking.data && {
          connected: striking.data.connected,
          rows: striking.data.connected ? striking.data.strikingDistance : [],
        }
      : cached?.value;
  if (result && !result.connected)
    return (
      <GoogleConnectionCard provider="gsc" projectId={projectId} prominent />
    );

  return (
    <DashboardKeywordTable
      resetKey={source}
      rows={result?.rows ?? []}
      showPages={source === "striking"}
      sortBy={source === "top" ? "clicks" : "impressions"}
      isLoading={query.isPending}
      error={
        query.isError ? (
          <QueryError
            error={query.error}
            fallback="Não foi possível carregar as palavras"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        ) : null
      }
      empty={
        source === "new"
          ? {
              title:
                emerging.data?.value.hasSearchData === false
                  ? "Ainda não há dados de busca"
                  : "Nenhuma palavra nova esta semana",
            }
          : source === "striking"
            ? {
                title: "Nenhuma palavra entre as posições 5 e 20 neste período",
              }
            : { title: "Nenhuma palavra ainda" }
      }
      tabs={
        <DataTableTabs
          value={source}
          onValueChange={(value) => {
            const next = SOURCES.find((item) => item === value);
            if (next) setSource(next);
          }}
          actions={
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link
                  to="/p/$projectId/search-performance"
                  params={{ projectId }}
                />
              }
            >
              Ver análise completa do GSC →
            </Button>
          }
          description={
            <>
              {DESCRIPTIONS[source]}
              {cached ? <Freshness {...cached} /> : null}
            </>
          }
        >
          <TabsTrigger value="new">Palavras novas</TabsTrigger>
          <TabsTrigger value="top">Principais palavras</TabsTrigger>
          <TabsTrigger value="striking">Quase no topo</TabsTrigger>
        </DataTableTabs>
      }
    />
  );
}
