import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { ExportMenu } from "@/client/components/ExportMenu";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { ImportKeywordsButton } from "./ImportKeywordsDialog";

export function SavedKeywordsHeader({
  projectId,
  totalCount,
  exporting,
  metricsRefreshing,
  onExportCsv,
  onExportSheets,
  onRefreshMetrics,
}: {
  projectId: string;
  totalCount: number;
  exporting: "csv" | "sheets" | null;
  metricsRefreshing: boolean;
  onExportCsv: () => void;
  onExportSheets: () => void;
  onRefreshMetrics: () => void;
}) {
  const [confirmingRefresh, setConfirmingRefresh] = useState(false);
  const disabled = totalCount === 0 || exporting != null;

  return (
    <>
      <PageHeader
        title="Palavras salvas"
        description="Salve ideias da pesquisa, organize com etiquetas e volte quando for agir."
        actions={
          <>
            <ImportKeywordsButton projectId={projectId} />
            <Button
              variant="outline"
              size="sm"
              title="Buscar volume, dificuldade e CPC atualizados"
              disabled={disabled || metricsRefreshing}
              onClick={() => setConfirmingRefresh(true)}
            >
              <RefreshCw
                data-icon="inline-start"
                className={metricsRefreshing ? "animate-spin" : ""}
              />
              {metricsRefreshing ? "Updating..." : "Atualizar dados das palavras"}
            </Button>

            <ExportMenu
              actions={["sheets", "csv"]}
              busy={exporting != null}
              disabled={disabled}
              onExport={(action) =>
                action === "sheets" ? onExportSheets() : onExportCsv()
              }
            />
          </>
        }
      />

      {confirmingRefresh ? (
        <ConfirmDialog
          title="Atualizar dados das palavras?"
          confirmLabel="Atualizar dados"
          onConfirm={() => {
            setConfirmingRefresh(false);
            onRefreshMetrics();
          }}
          onClose={() => setConfirmingRefresh(false)}
        >
          Isto busca volume, dificuldade e CPC atualizados para todas as palavras salvas do projeto. Cada palavra usa créditos.
        </ConfirmDialog>
      ) : null}
    </>
  );
}
