import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/client/components/ui/button";
import { getSetup } from "@/serverFunctions/project-setup";

const SETUP_STEPS = [
  "Empresa e site",
  "Mercado",
  "Fontes e páginas",
  "Palavras-chave",
  "Concorrentes",
  "Revisão",
] as const;

export type SetupData = Awaited<ReturnType<typeof getSetup>>;

const setupQueryKey = (projectId: string) => ["projectSetup", projectId];

export function useSetup(projectId: string) {
  return useQuery({
    queryKey: setupQueryKey(projectId),
    queryFn: () => getSetup({ data: { projectId } }),
  });
}

export function useInvalidateSetup(projectId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: setupQueryKey(projectId) });
}

/** Progress across the six steps (WizardHeader board). */
export function SetupProgress({ step }: { step: number }) {
  return (
    <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {SETUP_STEPS.map((label, index) => {
        const number = index + 1;
        const done = number < step;
        const current = number === step;
        return (
          <li key={label} className="flex flex-col gap-2">
            <span
              className={cn(
                "h-1 rounded-full",
                done || current ? "bg-primary" : "bg-border",
              )}
            />
            <span className="flex items-start gap-2">
              <span
                className={cn(
                  "grid size-[18px] shrink-0 place-items-center rounded-full text-[10.5px] font-semibold",
                  done && "bg-primary text-primary-foreground",
                  current && "border border-primary text-primary",
                  !done &&
                    !current &&
                    "border border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3" /> : number}
              </span>
              <span
                className={cn(
                  "text-[12.5px] leading-tight",
                  current ? "font-semibold" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function StepHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-[24px] font-semibold tracking-[-.01em]">{title}</h1>
      <p className="text-[13.5px] text-muted-foreground">{description}</p>
    </div>
  );
}

export function SetupCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-border bg-card p-5",
        className,
      )}
    >
      {title ? <h2 className="text-[15px] font-semibold">{title}</h2> : null}
      {children}
    </section>
  );
}

/** Back / continue row at the bottom of each step. */
export function StepFooter({
  onBack,
  onNext,
  nextLabel = "Continuar",
  pending = false,
  disabled = false,
  hint,
  secondary,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  pending?: boolean;
  disabled?: boolean;
  hint?: string;
  secondary?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
      {onBack ? (
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
      ) : null}
      <span className="flex-1 text-[12.5px] text-muted-foreground">{hint}</span>
      {secondary}
      <Button onClick={onNext} pending={pending} disabled={disabled}>
        {nextLabel}
      </Button>
    </div>
  );
}
