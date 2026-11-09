import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Search, Swords } from "lucide-react";
import { sortBy } from "remeda";
import { cn } from "cn";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Skeleton } from "@/client/components/ui/skeleton";
import { QueryError } from "@/client/components/QueryState";
import {
  getLatestRankResults,
  getRankTrackingConfigs,
} from "@/serverFunctions/rank-tracking";
import type { RankTrackingRow } from "@/types/schemas/rank-tracking";

type Device = "desktop" | "mobile";
type Config = Awaited<ReturnType<typeof getRankTrackingConfigs>>[number];

/**
 * dataSEO "Concorrentes" (visual direction v2, board 2c): the project's own
 * tracked keywords against every other domain tracked in the project. A
 * competitor's position comes from its own tracker's row for the same keyword.
 */
export function CompetitorsPage({
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
  const configs = configsQuery.data ?? [];
  const main =
    configs.find((config) => domain && config.domain === domain) ?? configs[0];
  const ordered = main
    ? [main, ...configs.filter((config) => config.id !== main.id)]
    : [];
  const latestQueries = useQueries({
    queries: ordered.map((config) => ({
      queryKey: ["rankLatestResults", projectId, config.id, "90d"],
      queryFn: () =>
        getLatestRankResults({
          data: { projectId, configId: config.id, comparePeriod: "90d" },
        }),
    })),
  });

  return (
    <div className="px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-.01em]">
            Comparação com concorrentes
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            As mesmas palavras, o mesmo mercado · posições da última coleta
          </p>
        </div>
        {configsQuery.isError ? (
          <QueryError
            error={configsQuery.error}
            fallback="Não foi possível carregar os domínios acompanhados"
            onRetry={() => void configsQuery.refetch()}
            isRetrying={configsQuery.isFetching}
          />
        ) : configsQuery.isPending ||
          latestQueries.some((query) => query.isPending) ? (
          <Skeleton className="h-96 w-full" />
        ) : !main || ordered.length < 2 ? (
          <NoCompetitors projectId={projectId} />
        ) : (
          <Comparison
            configs={ordered}
            results={latestQueries.map((query) => query.data?.rows ?? [])}
          />
        )}
      </div>
    </div>
  );
}

interface MatrixRow {
  keyword: string;
  volume: number | null;
  positions: Array<number | null>;
}

function Comparison({
  configs,
  results,
}: {
  configs: Config[];
  results: RankTrackingRow[][];
}) {
  const [query, setQuery] = useState("");
  const [sortIndex, setSortIndex] = useState<number | "volume">("volume");
  const device: Device =
    configs[0]!.devices === "desktop" ? "desktop" : "mobile";
  const byKeyword = results.map(
    (rows) =>
      new Map(rows.map((row) => [row.keyword.toLowerCase(), row[device]])),
  );
  const matrix: MatrixRow[] = (results[0] ?? []).map((row) => ({
    keyword: row.keyword,
    volume: row.searchVolume,
    positions: byKeyword.map(
      (map) => map.get(row.keyword.toLowerCase())?.position ?? null,
    ),
  }));

  const presence = configs.map((config, index) => {
    const positions = matrix.map((row) => row.positions[index] ?? null);
    return {
      domain: config.domain,
      isYou: index === 0,
      top3: positions.filter((p) => p !== null && p <= 3).length,
      top10: positions.filter((p) => p !== null && p <= 10).length,
      ahead:
        index === 0
          ? null
          : matrix.filter((row) => {
              const theirs = row.positions[index] ?? null;
              const yours = row.positions[0] ?? null;
              return theirs !== null && (yours === null || theirs < yours);
            }).length,
    };
  });

  const needle = query.trim().toLowerCase();
  const filtered = matrix.filter((row) =>
    row.keyword.toLowerCase().includes(needle),
  );
  const sorted =
    sortIndex === "volume"
      ? sortBy(filtered, [(row) => row.volume ?? -1, "desc"])
      : sortBy(filtered, (row) => row.positions[sortIndex] ?? 1000);

  return (
    <>
      <section className="rounded-lg border border-border bg-card">
        <h2 className="px-4 pt-4 text-[15px] font-semibold">Presença atual</h2>
        <p className="px-4 text-[12.5px] text-muted-foreground">
          De {matrix.length} palavras · «À sua frente» = palavras em que o
          domínio aparece melhor posicionado que você
        </p>
        <table className="mt-3 w-full text-[13px]">
          <thead>
            <tr className="border-y border-[#eeedf3] bg-[#fafafc] text-left text-[11.5px] text-muted-foreground">
              <th className="px-4 py-2 font-medium">Domínio</th>
              <th className="px-4 py-2 text-right font-medium">Top 3</th>
              <th className="px-4 py-2 text-right font-medium">Top 10</th>
              <th className="px-4 py-2 text-right font-medium">À sua frente</th>
            </tr>
          </thead>
          <tbody>
            {presence.map((entry) => (
              <tr
                key={entry.domain}
                className="border-b border-[#eeedf3] last:border-0"
              >
                <td
                  className={cn(
                    "px-4 py-2 font-mono",
                    entry.isYou && "font-semibold text-primary",
                  )}
                >
                  {entry.domain}
                  {entry.isYou ? " (você)" : ""}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {entry.top3}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {entry.top10}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {entry.ahead ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-end justify-between gap-3 p-4">
          <div>
            <h2 className="text-[15px] font-semibold">
              Posição por palavra e domínio
            </h2>
            <p className="text-[12.5px] text-muted-foreground">
              Clique num cabeçalho de domínio para ordenar por ele · 1 = melhor
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar palavra"
              aria-label="Buscar palavra"
              className="pl-8"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-y border-[#eeedf3] bg-[#fafafc] text-left text-[11.5px] text-muted-foreground">
                <th className="px-4 py-2 font-medium">Palavra</th>
                <SortHeader
                  label="Volume"
                  active={sortIndex === "volume"}
                  onClick={() => setSortIndex("volume")}
                />
                {configs.map((config, index) => (
                  <SortHeader
                    key={config.id}
                    label={index === 0 ? "Você" : config.domain}
                    active={sortIndex === index}
                    onClick={() => setSortIndex(index)}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const best = Math.min(
                  ...row.positions.map((p) => p ?? Infinity),
                );
                return (
                  <tr
                    key={row.keyword}
                    className="border-b border-[#eeedf3] last:border-0"
                  >
                    <td className="px-4 py-2">{row.keyword}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {row.volume?.toLocaleString("pt-BR") ?? "—"}
                    </td>
                    {row.positions.map((position, index) => (
                      <td
                        key={configs[index]!.id}
                        className="px-4 py-2 text-right"
                      >
                        <PositionCell
                          position={position}
                          best={position !== null && position === best}
                          isYou={index === 0}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sorted.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma palavra com essa busca.
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}

function SortHeader({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <th className="px-4 py-2 text-right font-medium">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "max-w-40 truncate font-mono hover:text-foreground",
          active && "font-semibold text-primary",
        )}
      >
        {label}
        {active ? " ↓" : ""}
      </button>
    </th>
  );
}

function PositionCell({
  position,
  best,
  isYou,
}: {
  position: number | null;
  best: boolean;
  isYou: boolean;
}) {
  if (position === null) {
    return <span className="text-[#b9b5c7]">—</span>;
  }
  return (
    <span
      className={cn(
        "inline-block min-w-8 rounded px-1.5 text-center tabular-nums",
        best && "bg-[#e5f3ec] font-semibold text-[#14613f]",
        !best && isYou && "font-semibold text-primary",
      )}
    >
      {position}
    </span>
  );
}

function NoCompetitors({ projectId }: { projectId: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border bg-card p-5">
      <span className="grid size-9 place-items-center rounded-md bg-accent text-primary">
        <Swords className="size-4" />
      </span>
      <div>
        <h2 className="text-base font-semibold">
          Adicione concorrentes para comparar
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe o domínio de cada concorrente com as mesmas palavras do seu
          site. A comparação aparece aqui depois da primeira coleta.
        </p>
      </div>
      <Button
        nativeButton={false}
        render={
          <Link to="/p/$projectId/rank-tracking" params={{ projectId }} />
        }
      >
        Adicionar domínio
      </Button>
    </div>
  );
}
