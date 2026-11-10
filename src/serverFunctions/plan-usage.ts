import { createServerFn } from "@tanstack/react-start";
import { PlanUsageService } from "@/server/features/plan-usage/PlanUsageService";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

/** The current organization's plan usage for the consumo screen. */
export const getPlanUsage = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) =>
    PlanUsageService.getOrganizationUsage(context.organizationId),
  );
