import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { formatQueries } from "@/client/features/plan-usage/planUsage";
import type { getPlatformOverview } from "@/serverFunctions/platform";

export type Overview = Awaited<ReturnType<typeof getPlatformOverview>>;

export const OVERVIEW_KEY = ["platform-overview"];
const DEFAULT_PLAN_VALUE = "default";

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function planOptions(overview: Overview) {
  return [
    {
      value: DEFAULT_PLAN_VALUE,
      label: `${overview.defaultPlan.name} (padrão) · ${formatQueries(overview.defaultPlan.monthlyQueries)}`,
    },
    ...overview.plans.map((plan) => ({
      value: plan.id,
      label: `${plan.name} · ${formatQueries(plan.monthlyQueries)}`,
    })),
  ];
}

export function PlanSelect({
  overview,
  value,
  onChange,
  disabled,
  label,
}: {
  overview: Overview;
  value: string | null;
  onChange: (planId: string | null) => void;
  disabled?: boolean;
  label: string;
}) {
  const options = planOptions(overview);
  return (
    <Select
      items={options}
      value={value ?? DEFAULT_PLAN_VALUE}
      onValueChange={(next) =>
        onChange(next === DEFAULT_PLAN_VALUE || !next ? null : String(next))
      }
      disabled={disabled}
    >
      <SelectTrigger aria-label={label} className="min-w-52">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function useRefreshOverview() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
}
