import {
  createColumnHelper,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, type ReactNode } from "react";
import {
  DataTable,
  makeSelectionColumn,
  useDataTable,
  useSelectionAnchor,
} from "@/client/components/table/DataTable";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import { ScoreBadge } from "@/client/components/table/ScoreBadge";
import { IntentBadge } from "@/client/features/keywords/components";
import type { KeywordIntent, SavedKeywordRow } from "@/types/keywords";
import { TagChip } from "./TagChip";
import {
  formatSavedKeywordDate,
  formatSavedKeywordNumber,
} from "./savedKeywordsUtils";

const columnHelper = createColumnHelper<SavedKeywordRow>();

export function SavedKeywordsTable({
  rows,
  rowSelection,
  sorting,
  isLoading,
  hasActiveFilters,
  onClearFilters,
  onRowSelectionChange,
  onSortingChange,
  toolbar,
  footer,
}: {
  rows: SavedKeywordRow[];
  rowSelection: RowSelectionState;
  sorting: SortingState;
  isLoading: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  onSortingChange: OnChangeFn<SortingState>;
  toolbar: ReactNode;
  footer: ReactNode;
}) {
  const selectAnchorRef = useSelectionAnchor();
  const columns = useMemo<ColumnDef<SavedKeywordRow>[]>(
    () => [
      makeSelectionColumn<SavedKeywordRow>(selectAnchorRef),
      columnHelper.accessor("keyword", {
        header: ({ column }) => (
          <SortableHeader column={column} label="Palavra" />
        ),
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue()}</span>
        ),
      }),
      columnHelper.accessor("searchVolume", {
        header: ({ column }) => (
          <SortableHeader column={column} label="Volume" />
        ),
        cell: ({ getValue }) => formatSavedKeywordNumber(getValue()),
      }),
      columnHelper.accessor("cpc", {
        header: ({ column }) => <SortableHeader column={column} label="CPC" />,
        cell: ({ getValue }) => {
          const value = getValue();
          return value == null ? "-" : `$${value.toFixed(2)}`;
        },
      }),
      columnHelper.accessor("competition", {
        header: ({ column }) => (
          <SortableHeader
            column={column}
            label="Concorrência"
            helpText="Concorrência em anúncios do Google Ads (0 a 1): quanto maior, mais anunciantes disputando."
          />
        ),
        cell: ({ getValue }) => {
          const value = getValue();
          return value == null ? "-" : value.toFixed(2);
        },
      }),
      columnHelper.accessor("keywordDifficulty", {
        header: ({ column }) => (
          <SortableHeader
            column={column}
            label="Dificuldade"
            helpText="Dificuldade orgânica (0 a 100): quanto maior, mais difícil chegar ao top 10 do Google."
          />
        ),
        cell: ({ getValue }) => <ScoreBadge value={getValue()} />,
      }),
      columnHelper.accessor("intent", {
        header: () => "Intenção",
        cell: ({ getValue }) => (
          <IntentBadge intent={normalizeIntent(getValue())} />
        ),
        enableSorting: false,
      }),
      columnHelper.display({
        id: "tags",
        header: () => "Etiquetas",
        cell: ({ row }) => <TagList tags={row.original.tags} />,
        enableSorting: false,
        meta: { cellClassName: "min-w-40 max-w-64" },
      }),
      columnHelper.accessor("fetchedAt", {
        header: ({ column }) => (
          <SortableHeader column={column} label="Última busca" />
        ),
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {formatSavedKeywordDate(getValue())}
          </span>
        ),
      }),
    ],
    [selectAnchorRef],
  );
  const table = useDataTable({
    data: rows,
    columns,
    state: { rowSelection, sorting },
    onRowSelectionChange,
    onSortingChange,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    manualSorting: true,
    // The server sorts by one column, so there is always exactly one sort:
    // a click flips its direction and shift+click does not add a second.
    enableSortingRemoval: false,
    enableMultiSort: false,
  });

  return (
    <DataTable
      table={table}
      isLoading={isLoading}
      isFiltered={hasActiveFilters}
      onClearFilters={onClearFilters}
      empty={{
        title: "Nenhuma palavra salva ainda",
        description:
          "Use a Pesquisa de palavras para encontrar e salvar palavras.",
      }}
      toolbar={toolbar}
      footer={footer}
    />
  );
}

function normalizeIntent(value: string | null): KeywordIntent {
  switch (value) {
    case "informational":
    case "commercial":
    case "transactional":
    case "navigational":
    case "unknown":
      return value;
    default:
      return "unknown";
  }
}

function TagList({ tags }: { tags: SavedKeywordRow["tags"] }) {
  if (tags.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <TagChip key={tag.id} tag={tag} size="xs" />
      ))}
    </div>
  );
}
