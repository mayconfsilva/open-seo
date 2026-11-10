import { queryOptions } from "@tanstack/react-query";
import { cn } from "cn";
import {
  getDataforseoBalance,
  getPlanUsage,
} from "@/serverFunctions/plan-usage";

export type PlanUsage = Awaited<ReturnType<typeof getPlanUsage>>;

export const planUsageQueryOptions = () =>
  queryOptions({
    queryKey: ["plan-usage"],
    queryFn: () => getPlanUsage(),
    staleTime: 60 * 1000,
  });

export const dataforseoBalanceQueryOptions = () =>
  queryOptions({
    queryKey: ["dataforseo-balance"],
    queryFn: () => getDataforseoBalance(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

const usdFormat = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "USD",
});

export function formatUsd(value: number) {
  return usdFormat.format(value);
}

const SEGMENTS = 20;
const numberFormat = new Intl.NumberFormat("pt-BR");

export function formatQueries(value: number) {
  return numberFormat.format(value);
}

/** "1 dez", the renewal date as the boards write it. */
export function formatPlanDay(value: string) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "numeric",
    month: "short",
  }).formatToParts(new Date(value));
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return `${day} ${month.replace(".", "")}`;
}

/** A date of the plan's calendar, which turns over in Brasília. */
export function formatPlanDate(
  value: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Date(value)
    .toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", ...options })
    .replace(".", "");
}

export function usedPercent(usage: Pick<PlanUsage, "used" | "plan">) {
  return Math.round((usage.used / usage.plan.monthlyQueries) * 100);
}

/**
 * The plan meter of the boards: used segments dark, what the schedules will
 * still use before renewal lighter, the rest empty.
 */
export function PlanMeter({
  usage,
  segments = SEGMENTS,
  className,
}: {
  usage: Pick<PlanUsage, "used" | "upcoming" | "plan">;
  segments?: number;
  className?: string;
}) {
  const quota = usage.plan.monthlyQueries;
  const used = Math.min(segments, Math.round((usage.used / quota) * segments));
  const upcoming = Math.min(
    segments - used,
    Math.round((usage.upcoming / quota) * segments),
  );
  return (
    <div
      className={cn("grid gap-0.5", className)}
      style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-[1px]",
            i < used
              ? "bg-(--rank-1)"
              : i < used + upcoming
                ? "bg-(--rank-2)"
                : "bg-track",
          )}
        />
      ))}
    </div>
  );
}
