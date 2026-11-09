import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { confirmSetup } from "@/serverFunctions/project-setup";
import { LOCATIONS } from "@/shared/keyword-locations";
import { estimateScheduledRankCheckCredits } from "@/shared/rank-tracking";
import {
  SetupCard,
  StepFooter,
  StepHeading,
  type SetupData,
} from "./setupShared";

type Interval = "daily" | "weekly" | "monthly";
type Devices = "both" | "desktop" | "mobile";

const INTERVALS: Array<{ value: Interval; label: string; help: string }> = [
  { value: "daily", label: "Diária", help: "Para buscas muito disputadas" },
  { value: "weekly", label: "Semanal", help: "Recomendado para a maioria" },
  { value: "monthly", label: "Mensal", help: "Só para relatório do mês" },
];

const DEVICE_OPTIONS: Array<[Devices, string]> = [
  ["mobile", "Celular"],
  ["desktop", "Computador"],
  ["both", "Celular e computador"],
];

const usd = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "USD" });

/** Step 6 (board 5f): summary, frequency and cost; confirming starts it all. */
export function StepReview({
  setup,
  onBack,
  onEdit,
  onConfirmed,
}: {
  setup: SetupData;
  onBack: () => void;
  onEdit: (step: number) => void;
  onConfirmed: () => void;
}) {
  const config = setup.config;
  const [cadence, setCadence] = useState<Interval>(
    config && config.scheduleInterval !== "manual"
      ? config.scheduleInterval
      : "weekly",
  );
  const [devices, setDevices] = useState<Devices>(config?.devices ?? "mobile");
  const keywords = setup.keywords.map((kw) => kw.keyword);
  const estimate = estimateScheduledRankCheckCredits(
    keywords,
    devices,
    config?.serpDepth ?? 20,
    cadence,
  );
  const groups = new Set(setup.keywords.map((kw) => kw.group ?? ""));

  const confirm = useMutation({
    mutationFn: () =>
      confirmSetup({
        data: {
          projectId: setup.project.id,
          scheduleInterval: cadence,
          devices,
        },
      }),
    onSuccess: onConfirmed,
  });

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="Revise e comece a acompanhar"
        description="Nada foi coletado até aqui. Ao confirmar, fazemos a primeira coleta das posições e a auditoria do site."
      />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <SetupCard title="Resumo">
          <dl className="flex flex-col divide-y divide-border">
            <SummaryRow label="Site" onEdit={() => onEdit(1)}>
              {setup.project.name} · {setup.project.domain}
              {setup.services.length > 0
                ? ` · ${setup.services.join(", ")}`
                : ""}
            </SummaryRow>
            <SummaryRow label="Mercado" onEdit={() => onEdit(2)}>
              {config?.locationName ??
                LOCATIONS[
                  config?.locationCode ?? setup.project.locationCode
                ]}{" "}
              · idioma {config?.languageCode ?? setup.project.languageCode}
            </SummaryRow>
            <SummaryRow label="Palavras" onEdit={() => onEdit(4)}>
              {keywords.length} palavra(s) em {groups.size} grupo(s)
            </SummaryRow>
            <SummaryRow label="Concorrentes" onEdit={() => onEdit(5)}>
              {setup.competitors.length > 0
                ? setup.competitors.map((c) => c.domain).join(", ")
                : "Nenhum por enquanto"}
            </SummaryRow>
          </dl>
        </SetupCard>
        <SetupCard title="Frequência e custo">
          <div className="flex flex-col gap-2">
            {INTERVALS.map((option) => (
              <Choice
                key={option.value}
                selected={cadence === option.value}
                onSelect={() => setCadence(option.value)}
                label={option.label}
                help={option.help}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DEVICE_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={devices === value}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[12.5px]",
                  devices === value
                    ? "border-primary bg-accent text-primary"
                    : "border-border text-muted-foreground",
                )}
                onClick={() => setDevices(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2.5 text-[12.5px] text-muted-foreground">
            <p className="text-[18px] font-semibold text-foreground">
              até {usd(estimate.monthlyCostUsd)}{" "}
              <span className="text-[12.5px] font-normal">por mês</span>
            </p>
            <p>
              {estimate.checksPerMonth} coleta(s) × até {usd(estimate.costUsd)}{" "}
              cada, cobrado na sua conta DataForSEO. É o teto: a maioria das
              coletas sai mais barata.
            </p>
          </div>
        </SetupCard>
      </div>
      {confirm.isError ? (
        <p className="text-sm text-destructive">
          {getStandardErrorMessage(confirm.error)}
        </p>
      ) : null}
      <StepFooter
        onBack={onBack}
        onNext={() => confirm.mutate()}
        pending={confirm.isPending}
        disabled={keywords.length === 0}
        nextLabel="Confirmar e fazer a primeira coleta"
        hint="Você pode mudar frequência e dispositivos depois."
      />
    </div>
  );
}

function SummaryRow({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 text-[13px]">
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="flex-1">{children}</dd>
      <button
        type="button"
        className="text-[12.5px] text-primary hover:underline"
        onClick={onEdit}
      >
        Editar
      </button>
    </div>
  );
}

function Choice({
  selected,
  onSelect,
  label,
  help,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  help: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex items-center justify-between rounded-md border px-3 py-2 text-left",
        selected ? "border-primary bg-accent" : "border-border",
      )}
    >
      <span className="text-[13px] font-medium">{label}</span>
      <span className="text-[12px] text-muted-foreground">{help}</span>
    </button>
  );
}
