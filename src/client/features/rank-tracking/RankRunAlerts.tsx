import { AlertTriangle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { InsufficientCreditsError } from "@/client/features/billing/InsufficientCreditsError";
import { isOutOfCreditsRunError } from "@/shared/rank-tracking";
import type { useRankRunPolling } from "./useRankRunPolling";

function ReadWhatChangedLink() {
  return (
    <a
      href="https://openseo.so/blogs/state-of-rank-tracking-november-2026"
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium underline underline-offset-4"
    >
      Veja o que mudou
    </a>
  );
}

/** The latest rank check's state: running, stale, failed, or incomplete. */
export function RankRunAlerts({
  run,
}: {
  run: ReturnType<typeof useRankRunPolling>;
}) {
  if (!run) return null;

  if (run.maybeStale) {
    return (
      <Alert variant="warning">
        <AlertTriangle />
        <AlertDescription className="text-foreground">
          Esta coleta parou de responder. Você pode iniciar outra para
          substituí-la.
        </AlertDescription>
      </Alert>
    );
  }

  if (run.status === "pending" || run.status === "running") {
    return (
      <Alert variant="info">
        <Clock />
        <AlertDescription className="text-foreground">
          <p>
            <span className="font-medium">
              Esta coleta leva cerca de uma hora
            </span>{" "}
            porque os resultados do Google andam instáveis. Você pode sair desta página enquanto roda. <ReadWhatChangedLink />
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (run.status === "failed" && isOutOfCreditsRunError(run.errorMessage)) {
    return (
      <InsufficientCreditsError title="A última coleta de posições não rodou" />
    );
  }

  if (run.status === "failed") {
    return (
      <Alert variant="warning">
        <AlertTriangle />
        <AlertDescription className="text-foreground">
          <p>
            <span className="font-medium">
              Não conseguimos concluir a última coleta.
            </span>{" "}
            Os resultados do Google andam instáveis para todas as ferramentas de posição. Tente de novo mais tarde. <ReadWhatChangedLink />
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // A completed run only has an error message when some checks have no result.
  if (run.status === "completed" && run.errorMessage) {
    return (
      <Alert variant="warning">
        <AlertTriangle />
        <AlertDescription className="text-foreground">
          <p>
            <span className="font-medium">
              Algumas palavras não puderam ser coletadas.
            </span>{" "}
            Os resultados do Google andam instáveis para todas as ferramentas de posição, então estas mostram a última posição conhecida. <ReadWhatChangedLink />
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
