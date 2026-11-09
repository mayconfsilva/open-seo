import { Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { useRankRunPolling } from "@/client/features/rank-tracking/useRankRunPolling";
import { SetupCard, StepHeading, type SetupData } from "./setupShared";

/** Board 5g: the first check after confirming, with live progress. */
export function FirstCheck({ setup }: { setup: SetupData }) {
  const projectId = setup.project.id;
  const run = useRankRunPolling(projectId, setup.config?.id ?? "");
  const total = run?.keywordsTotal ?? 0;
  const checked = run?.keywordsChecked ?? 0;
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
  const done = run?.status === "completed";
  const failed = run?.status === "failed";

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title={
          done
            ? `${setup.project.name} está sendo acompanhado`
            : "Fazendo a primeira coleta"
        }
        description="Buscamos cada palavra no Google e anotamos a posição do seu site e dos concorrentes. A auditoria do site roda ao mesmo tempo."
      />
      <SetupCard>
        <div className="flex items-center gap-3">
          {done ? (
            <CheckCircle2 className="size-5 text-primary" />
          ) : (
            <Loader2 className="size-5 animate-spin text-primary" />
          )}
          <span className="text-[14px] font-medium">
            {failed
              ? "A coleta falhou"
              : done
                ? "Primeira coleta concluída"
                : run
                  ? `${checked} de ${total} palavra(s) verificada(s)`
                  : "Preparando a coleta…"}
          </span>
          <span className="ml-auto text-[13px] text-muted-foreground">
            {percent}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${done ? 100 : percent}%` }}
          />
        </div>
        {failed && run.errorMessage ? (
          <p className="text-sm text-destructive">{run.errorMessage}</p>
        ) : null}
        <p className="text-[12.5px] text-muted-foreground">
          Leva alguns minutos. Você pode sair desta tela: a coleta continua e os
          resultados aparecem no Resumo.
        </p>
      </SetupCard>
      <div className="flex flex-wrap gap-3">
        <Button
          render={<Link to="/p/$projectId" params={{ projectId }} />}
          nativeButton={false}
        >
          {done ? "Ver resultados" : "Ver resultados parciais"}
        </Button>
        <Button
          variant="outline"
          render={<Link to="/projects" />}
          nativeButton={false}
        >
          Ir para a carteira
        </Button>
      </div>
    </div>
  );
}
