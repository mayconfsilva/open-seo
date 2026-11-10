import { Loader2 } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { DialogFooter } from "@/client/components/ui/dialog";
import { aiMarketLabel, type AiCostEstimate } from "@/shared/ai-visibility";
import { EngineLabel } from "./EngineLabel";
import type { AiTrackerPatch } from "@/types/schemas/ai-visibility";
import { AiQueryError, aiMoney } from "./shared";

export type TrackerSetupReviewData = {
  patch: AiTrackerPatch;
  estimate: AiCostEstimate;
};

export function TrackerSetupReview({
  review,
  enabled,
  creating,
  pending,
  error,
  canSchedule,
  scheduling,
  onBack,
  onSave,
  onSaveAndSchedule,
}: {
  review: TrackerSetupReviewData;
  enabled: boolean;
  /** No tracker yet; saving creates one on the weekly schedule. */
  creating: boolean;
  pending: boolean;
  error: unknown;
  canSchedule: boolean;
  scheduling: boolean;
  onBack: () => void;
  onSave: () => void;
  onSaveAndSchedule: () => void;
}) {
  const paused = !enabled && !creating;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Revise as mudanças antes de salvar.{" "}
        {enabled
          ? "Estas configurações valem para o agendamento ativo."
          : creating
            ? "O acompanhamento roda toda semana. A primeira coleta é daqui a uma semana; use Rodar agora para ter resultados antes."
            : "Acompanhe semanalmente para coletar respostas novas toda semana. Um acompanhamento que nunca rodou agendado também faz a primeira coleta agora."}
      </p>
      <dl className="grid grid-cols-2 gap-4 rounded-lg border p-4 text-sm border-border">
        {review.patch.engines && (
          <div>
            <dt className="text-muted-foreground">IAs</dt>
            <dd className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {review.patch.engines?.map((engine) => (
                <EngineLabel key={engine} engine={engine} />
              ))}
            </dd>
          </div>
        )}
        {review.patch.prompts !== undefined && (
          <div>
            <dt className="text-muted-foreground">Novos prompts</dt>
            <dd className="mt-1">{review.patch.prompts?.length ?? 0}</dd>
          </div>
        )}
        {review.patch.prompts?.[0]?.topic && (
          <div>
            <dt className="text-muted-foreground">Tema</dt>
            <dd className="mt-1">{review.patch.prompts[0].topic}</dd>
          </div>
        )}
        {review.patch.locationCode && review.patch.languageCode && (
          <div>
            <dt className="text-muted-foreground">Mercado</dt>
            <dd className="mt-1">
              {aiMarketLabel({
                locationCode: review.patch.locationCode,
                languageCode: review.patch.languageCode,
              })}
            </dd>
          </div>
        )}
      </dl>
      {!!review.patch.prompts?.length && (
        <div
          className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-4 border-border"
          data-ph-mask
        >
          <h3 className="text-sm font-semibold">Prompts a adicionar</h3>
          {review.patch.prompts.map((prompt) => (
            <p
              key={prompt.text}
              className="whitespace-pre-wrap text-[0.8125rem] leading-relaxed"
            >
              {prompt.text}
            </p>
          ))}
        </div>
      )}
      <div className="space-y-1 rounded-lg bg-muted/60 p-4 text-sm">
        <p>
          Cada execução coleta <strong>{review.estimate.observations}</strong>{" "}
          {review.estimate.observations === 1 ? "answer" : "answers"} for{" "}
          <strong>{aiMoney(review.estimate.costUsd)}</strong>
        </p>
        <p>
          <strong>{aiMoney(review.estimate.monthlyCostUsd)}</strong> estimados por mês se rodar {review.estimate.scheduleInterval}.
        </p>
      </div>
      {!!error && <AiQueryError error={error} />}
      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onBack}
        >
          Voltar à edição
        </Button>
        <Button
          type="button"
          variant={paused ? "secondary" : "default"}
          disabled={pending}
          onClick={onSave}
        >
          {pending && !scheduling && (
            <Loader2 className="size-4 animate-spin" />
          )}
          {enabled
            ? "Salvar mudanças revisadas"
            : creating
              ? "Salvar e acompanhar toda semana"
              : "Salvar pausado"}
        </Button>
        {paused && (
          <Button
            type="button"
            disabled={
              pending || !canSchedule || review.estimate.observations === 0
            }
            onClick={onSaveAndSchedule}
          >
            {pending && scheduling && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Salvar e acompanhar toda semana
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
