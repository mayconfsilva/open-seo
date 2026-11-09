import type { ColumnDef } from "@tanstack/react-table";
import { Check, TriangleAlert } from "lucide-react";
import { Badge } from "@/client/components/ui/badge";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import type { RankTrackingRow } from "@/types/schemas/rank-tracking";
import { comparablePath } from "./comparablePath";

const HEADER_CLASS = "text-xs uppercase tracking-wide text-muted-foreground";

const INTENT_LABELS: Record<string, { label: string; title: string }> = {
  informational: {
    label: "Informacional",
    title: "Quem busca quer aprender ou tirar uma dúvida",
  },
  commercial: {
    label: "Comercial",
    title: "Quem busca está comparando opções antes de decidir",
  },
  transactional: {
    label: "Transacional",
    title: "Quem busca quer contratar ou comprar agora",
  },
  navigational: {
    label: "Navegacional",
    title: "Quem busca procura um site ou marca específica",
  },
};

export const intentColumn: ColumnDef<RankTrackingRow> = {
  id: "intent",
  accessorFn: (row) => row.searchIntent ?? undefined,
  header: ({ column }) => (
    <SortableHeader
      column={column}
      label="Intenção"
      title="O que a pessoa quer quando faz essa busca"
      className={HEADER_CLASS}
    />
  ),
  size: 120,
  cell: ({ getValue }) => {
    const intent = INTENT_LABELS[getValue<string | undefined>() ?? ""];
    if (!intent) return <span className="text-muted-foreground">-</span>;
    return (
      <Badge
        variant="secondary"
        size="sm"
        className="cursor-help"
        title={intent.title}
      >
        {intent.label}
      </Badge>
    );
  },
  sortUndefined: "last",
};

export function makeGroupColumn(
  groupNames: Map<string, string>,
): ColumnDef<RankTrackingRow> {
  return {
    id: "group",
    accessorFn: (row) =>
      row.groupId ? (groupNames.get(row.groupId) ?? undefined) : undefined,
    header: ({ column }) => (
      <SortableHeader
        column={column}
        label="Grupo"
        title="Grupo em que você organizou a palavra"
        className={HEADER_CLASS}
      />
    ),
    size: 130,
    cell: ({ getValue }) => {
      const name = getValue<string | undefined>();
      if (!name) return <span className="text-muted-foreground">-</span>;
      return <span className="block truncate text-xs">{name}</span>;
    },
    sortUndefined: "last",
  };
}

type TargetStatus = "match" | "other" | "none";

function targetStatus(
  row: RankTrackingRow,
  devices: Array<"desktop" | "mobile">,
): TargetStatus {
  if (!row.targetUrl) return "none";
  const target = comparablePath(row.targetUrl);
  const ranking = devices
    .map((device) => row[device].rankingUrl)
    .filter((url): url is string => url != null);
  if (ranking.length === 0) return "none";
  return ranking.some((url) => comparablePath(url) === target)
    ? "match"
    : "other";
}

export function makeTargetColumn(
  devices: Array<"desktop" | "mobile">,
): ColumnDef<RankTrackingRow> {
  return {
    id: "target",
    enableSorting: false,
    header: () => (
      <span
        className="cursor-help text-xs font-medium tracking-wide uppercase text-muted-foreground"
        title="A página que deveria aparecer no Google para esta palavra"
      >
        Página alvo
      </span>
    ),
    size: 200,
    cell: ({ row }) => {
      const target = row.original.targetUrl;
      if (!target) return <span className="text-muted-foreground">-</span>;
      const status = targetStatus(row.original, devices);
      return (
        <span className="flex min-w-0 items-center gap-1 text-xs">
          {status === "match" ? (
            <Check
              className="size-3.5 shrink-0 text-emerald-600"
              aria-label="A página alvo é a que aparece no Google"
            />
          ) : null}
          {status === "other" ? (
            <TriangleAlert
              className="size-3.5 shrink-0 text-amber-600"
              aria-label="Outra página do site aparece no Google no lugar da alvo"
            />
          ) : null}
          <span
            className="truncate"
            title={
              status === "other"
                ? "Outra página do site aparece no Google no lugar desta"
                : target
            }
          >
            {comparablePath(target)}
          </span>
        </span>
      );
    },
  };
}
