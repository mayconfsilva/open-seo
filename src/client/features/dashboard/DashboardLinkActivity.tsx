import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/client/components/ui/table";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { CardShell } from "@/client/components/CardShell";
import { EmptyState } from "@/client/components/EmptyState";
import { Button } from "@/client/components/ui/button";
import { QueryState } from "@/client/components/QueryState";
import { getDashboardLinkActivity } from "@/serverFunctions/dashboard";
import { DashboardInfo, ExternalPage, Freshness } from "./siteTabParts";
import { cardTableClass, moreDetailsClass } from "./cardParts";
export function DashboardLinkActivity({
  projectId,
  domain,
}: {
  projectId: string;
  domain: string;
}) {
  const query = useQuery({
    queryKey: ["dashboardLinkActivity", projectId, domain],
    queryFn: () => getDashboardLinkActivity({ data: { projectId } }),
    staleTime: 86400_000,
    retry: false,
  });
  return (
    <QueryState
      query={query}
      errorFallback="Não foi possível carregar os links novos"
    >
      {(data) => (
        <CardShell
          title="Backlinks novos"
          icon={<Link2 className="size-5" />}
          titleInfo={
            <DashboardInfo label="Sobre os links novos">
              <p>
                Links para seu site encontrados na última semana. Os sites novos
                aparecem primeiro.
              </p>
              <p className="mt-2">
                Um link pode ser mais antigo que a data em que foi encontrado.
              </p>
            </DashboardInfo>
          }
          action={
            <Link
              to="/p/$projectId"
              params={{ projectId }}
              search={{ tab: "backlinks" }}
              className={moreDetailsClass}
              aria-label="Ver todos os backlinks novos"
            >
              Ver tudo
            </Link>
          }
        >
          <Freshness {...data} />
          {data.value.length ? (
            <Table className={cardTableClass}>
              <TableHeader>
                <TableRow>
                  <TableHead>Domínio de origem</TableHead>
                  <TableHead className="text-right">Backlinks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.value.slice(0, 5).map((row, index) => (
                  <TableRow key={row.domain ?? index}>
                    <TableCell className="font-medium">
                      <ExternalPage
                        url={row.domain ? `https://${row.domain}` : null}
                        label={row.domain}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.backlinks?.toLocaleString() ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : data.links.length ? (
            <Table className={cardTableClass}>
              <TableHeader>
                <TableRow>
                  <TableHead>Página de origem</TableHead>
                  <TableHead>Âncora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.links.slice(0, 5).map((row, index) => (
                  <TableRow key={`${row.urlFrom}:${index}`}>
                    <TableCell>
                      <ExternalPage url={row.urlFrom} label={row.domainFrom} />
                    </TableCell>
                    <TableCell
                      className="max-w-48 truncate"
                      title={row.anchor ?? undefined}
                    >
                      {row.anchor || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              variant="plain"
              icon={Link2}
              title="Nenhum link novo esta semana"
              description="Explore os sites que já apontam para você."
              action={
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link
                      to="/p/$projectId"
                      params={{ projectId }}
                      search={{ tab: "backlinks" }}
                    />
                  }
                >
                  Ver backlinks
                </Button>
              }
            />
          )}
        </CardShell>
      )}
    </QueryState>
  );
}
