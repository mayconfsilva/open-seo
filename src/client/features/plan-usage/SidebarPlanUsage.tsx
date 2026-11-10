import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSidebar } from "@/client/components/ui/sidebar";
import {
  PlanMeter,
  formatPlanDay,
  formatQueries,
  planUsageQueryOptions,
  usedPercent,
} from "./planUsage";

/** The plan block at the foot of the sidebar's navigation (sidebar board). */
export function SidebarPlanUsage({ ready }: { ready: boolean }) {
  const { setOpenMobile } = useSidebar();
  const { data: usage } = useQuery({
    ...planUsageQueryOptions(),
    enabled: ready,
  });
  // An unlimited plan has nothing to watch; its Consumo link lives on Plataforma.
  if (!usage || usage.plan.monthlyQueries === null) return null;
  return (
    <div className="px-3 pb-3">
      <div className="flex flex-col gap-2 rounded-lg border border-hairline bg-subtle p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[12.5px] font-semibold">{usage.plan.name}</span>
          <span className="text-[11.5px] text-muted-foreground tabular-nums">
            {usage.plan.monthlyQueries === null
              ? "Sem limite"
              : `${usedPercent(usage)}% usado`}
          </span>
        </div>
        <PlanMeter usage={usage} />
        <p className="text-[11.5px] leading-snug text-muted-foreground">
          {usage.plan.monthlyQueries === null
            ? `${formatQueries(usage.used)} consultas este mês`
            : `${formatQueries(usage.used)} de ${formatQueries(usage.plan.monthlyQueries)} consultas · renova em ${formatPlanDay(usage.renewsAt)}`}
        </p>
        <Link
          to="/consumo"
          onClick={() => setOpenMobile(false)}
          className="text-[12px] font-medium text-primary hover:underline"
        >
          Ver consumo
        </Link>
      </div>
    </div>
  );
}
