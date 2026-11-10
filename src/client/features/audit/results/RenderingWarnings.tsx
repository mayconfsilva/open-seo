import { ShieldAlert } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";
import type { AuditResultsData } from "@/client/features/audit/results/types";

/** Report notices about JavaScript: app shells, and pages a render missed. */
export function RenderingWarnings({ data }: { data: AuditResultsData }) {
  const rendered = data.audit.config.renderJavaScript;
  const hasShells = data.issueGroups.some(
    (group) => group.issueType === "javascript-rendering-suspected",
  );
  const unreadCount = data.fetchClassCounts.error;

  return (
    <>
      {hasShells && (
        <Alert variant="warning">
          <ShieldAlert />
          <AlertTitle>
            Algumas páginas podem precisar de JavaScript para mostrar o
            conteúdo.
          </AlertTitle>
          <AlertDescription>
            {rendered
              ? "Elas ainda estavam carregando depois da renderização, então não foi possível verificá-las."
              : "Ative Renderizar JavaScript e rode a auditoria de novo para verificá-las."}
          </AlertDescription>
        </Alert>
      )}

      {rendered && unreadCount > 0 && (
        <Alert variant="warning">
          <ShieldAlert />
          <AlertTitle>
            Não foi possível ler {unreadCount}{" "}
            {unreadCount === 1 ? "página" : "páginas"}.
          </AlertTitle>
          <AlertDescription>
            Para vê-las, abra Páginas e filtre Resultado do rastreamento por
            Falhou.
          </AlertDescription>
        </Alert>
      )}

      {rendered && (
        <p className="text-sm text-muted-foreground">
          A renderização de JavaScript estava ativada nesta auditoria.
        </p>
      )}
    </>
  );
}
