import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Tag } from "lucide-react";
import { CardShell } from "@/client/components/CardShell";
import { EmptyState } from "@/client/components/EmptyState";
import { Button } from "@/client/components/ui/button";
import { QueryState } from "@/client/components/QueryState";
import { GoogleConnectionCard } from "@/client/features/integrations/GoogleConnectionCard";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/client/components/ui/table";
import { getDashboardEmergingQueries } from "@/serverFunctions/dashboard";
import { Freshness, DashboardInfo } from "./siteTabParts";
import { cardTableClass, moreDetailsClass } from "./cardParts";

export function DashboardNewQueries({
  projectId,
  connected,
  siteUrl,
}: {
  projectId: string;
  connected: boolean;
  siteUrl: string | null;
}) {
  const query = useQuery({
    queryKey: ["dashboardEmergingQueries", projectId, siteUrl],
    queryFn: () => getDashboardEmergingQueries({ data: { projectId } }),
    enabled: connected,
    staleTime: 10 * 60_000,
    retry: false,
  });
  if (!connected) return null;
  return (
    <QueryState
      query={query}
      errorFallback="Não foi possível carregar as palavras novas"
    >
      {(data) =>
        !data.value.connected ? (
          <GoogleConnectionCard
            provider="gsc"
            projectId={projectId}
            prominent
          />
        ) : (
          <CardShell
            title="Palavras novas"
            icon={<Tag className="size-5" />}
            titleInfo={
              <DashboardInfo label="Sobre as palavras novas">
                <p>Buscas em que seu site apareceu no Google recentemente.</p>
                <p className="mt-2">
                  Apareceram na última semana do Search Console, mas não nas
                  quatro anteriores.
                </p>
              </DashboardInfo>
            }
            action={
              <Link
                to="/p/$projectId"
                params={{ projectId }}
                search={{ tab: "keywords" }}
                className={moreDetailsClass}
                aria-label="Ver todas as palavras novas"
              >
                Ver tudo
              </Link>
            }
          >
            <Freshness {...data} />
            {data.value.rows.length ? (
              <Table className={cardTableClass}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Palavra</TableHead>
                    <TableHead className="text-right">Impressões</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.value.rows.slice(0, 5).map((row) => (
                    <TableRow key={row.query}>
                      <TableCell className="font-medium">{row.query}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.impressions.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.clicks.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                variant="plain"
                icon={Search}
                title={
                  data.value.hasSearchData
                    ? "Nenhuma palavra nova esta semana"
                    : "Ainda não há dados de busca"
                }
                description={
                  data.value.hasSearchData
                    ? "Suas buscas atuais podem estar ganhando cliques. Veja como estão indo."
                    : "O Google ainda não informou buscas para seu site. Confira a propriedade conectada no Search Console."
                }
                action={
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={
                      <Link
                        to="/p/$projectId/search-performance"
                        params={{ projectId }}
                      />
                    }
                  >
                    Ver análise completa do GSC
                  </Button>
                }
              />
            )}
          </CardShell>
        )
      }
    </QueryState>
  );
}
