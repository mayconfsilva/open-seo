import { useState, type ReactElement } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import { getRankCompetitorPositions } from "@/serverFunctions/rank-competitors";
import type { RankTrackingRow } from "@/types/schemas/rank-tracking";

type Device = "desktop" | "mobile";

/**
 * dataSEO "Concorrentes" (visual direction v2, board 2c): the main tracker's
 * keywords against the project's competitors. Competitor positions come from
 * the same results pages each check already reads for the tracked domain.
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
    configs.find((config) => domain && config.domain === domain) ??
    configs.at(0);
  const latestQuery = useQuery({
    queryKey: ["rankLatestResults", projectId, main?.id, "90d"],
    queryFn: () =>
      getLatestRankResults({
        data: { projectId, configId: main?.id ?? "", comparePeriod: "90d" },
      }),
    enabled: main !== undefined,
  });
  const competitorsQuery = useQuery({
    queryKey: ["rankCompetitorPositions", projectId, main?.id],
    queryFn: () =>
      getRankCompetitorPositions({
        data: { projectId, configId: main?.id ?? "" },
      }),
    enabled: main !== undefined,
  });
  const failed = [configsQuery, latestQuery, competitorsQuery].find(
    (query) => query.isError,
  );

  return (
    <div className="px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-.01em]">
            Comparação com concorrentes
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {main
              ? `As palavras de ${main.domain} · mesma coleta, mesmo mercado`
              : "As mesmas palavras, o mesmo mercado"}
          </p>
        </div>
        {failed ? (
          <QueryError
            error={failed.error}
            fallback="Não foi possível carregar a comparação"
            onRetry={() => void failed.refetch()}
            isRetrying={failed.isFetching}
          />
        ) : configsQuery.isPending ? (
          <Skeleton className="h-96 w-full" />
        ) : !main ? (
          <NoTracker projectId={projectId} />
        ) : !latestQuery.data || !competitorsQuery.data ? (
          <Skeleton className="h-96 w-full" />
        ) : competitorsQuery.data.domains.length === 0 ? (
          <NoCompetitors projectId={projectId} />
        ) : (
          <Comparison
            ownDomain={main.domain}
            device={main.devices === "desktop" ? "desktop" : "mobile"}
            rows={latestQuery.data.rows}
            competitors={competitorsQuery.data}
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

type CompetitorPositions = Awaited<
  ReturnType<typeof getRankCompetitorPositions>
>;

function Comparison({
  ownDomain,
  device,
  rows,
  competitors,
}: {
  ownDomain: string;
  device: Device;
  rows: RankTrackingRow[];
  competitors: CompetitorPositions;
}) {
  const [query, setQuery] = useState("");
  const [sortIndex, setSortIndex] = useState<number | "volume">("volume");
  const domains = competitors.domains;
  const competitorPosition = new Map(
    competitors.positions
      .filter((entry) => entry.device === device)
      .map((entry) => [
        `${entry.trackingKeywordId}:${entry.domain}`,
        entry.position,
      ]),
  );
  const matrix: MatrixRow[] = rows.map((row) => ({
    keyword: row.keyword,
    volume: row.searchVolume,
    positions: [
      row[device].position,
      ...domains.map(
        (domain) =>
          competitorPosition.get(`${row.trackingKeywordId}:${domain}`) ?? null,
      ),
    ],
  }));
  const columns = [
    { key: "you", label: "Você" },
    ...domains.map((domain) => ({ key: domain, label: domain })),
  ];

  const presence = columns.map((column, index) => {
    const positions = matrix.map((row) => row.positions[index] ?? null);
    return {
      domain: index === 0 ? `${ownDomain} (você)` : column.label,
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
                {columns.map((column, index) => (
                  <SortHeader
                    key={column.key}
                    label={column.label}
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
                        key={columns.at(index)?.key}
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

function NoTracker({ projectId }: { projectId: string }) {
  return (
    <EmptyState
      title="Acompanhe as palavras do seu site primeiro"
      description="A comparação usa as mesmas buscas que você acompanha. Cadastre o domínio do seu site e as palavras."
      action="Acompanhar palavras"
      link={<Link to="/p/$projectId/rank-tracking" params={{ projectId }} />}
    />
  );
}

function NoCompetitors({ projectId }: { projectId: string }) {
  return (
    <EmptyState
      title="Adicione concorrentes para comparar"
      description="Cadastre os sites concorrentes no contexto do projeto. Na próxima coleta, as posições deles saem das mesmas buscas, sem custo extra."
      action="Cadastrar concorrentes"
      link={<Link to="/p/$projectId/context" params={{ projectId }} />}
    />
  );
}

function EmptyState({
  title,
  description,
  action,
  link,
}: {
  title: string;
  description: string;
  action: string;
  link: ReactElement;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border bg-card p-5">
      <span className="grid size-9 place-items-center rounded-md bg-accent text-primary">
        <Swords className="size-4" />
      </span>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Button nativeButton={false} render={link}>
        {action}
      </Button>
    </div>
  );
}
