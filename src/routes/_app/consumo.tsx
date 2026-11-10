import { createFileRoute } from "@tanstack/react-router";
import { PlanUsagePage } from "@/client/features/plan-usage/PlanUsagePage";
import { pageHead } from "@/client/lib/pageHead";

export const Route = createFileRoute("/_app/consumo")({
  head: () => pageHead("Consumo do plano"),
  component: () => (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl">
        <PlanUsagePage />
      </div>
    </div>
  ),
});
