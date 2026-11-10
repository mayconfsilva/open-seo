import { createServerFn } from "@tanstack/react-start";
import { hasOrgPermission } from "@/lib/org-permissions";
import { fetchUserData } from "@/server/lib/dataforseo/appendix";
import { AppError } from "@/server/lib/errors";
import { PlanUsageService } from "@/server/features/plan-usage/PlanUsageService";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

/** The current organization's plan usage for the consumo screen. */
export const getPlanUsage = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) =>
    PlanUsageService.getOrganizationUsage(context.organizationId),
  );

/**
 * Money left on the DataForSEO account this install uses. The appendix call is
 * free. Owners and admins only: it is the agency's own spend.
 */
export const getDataforseoBalance = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) => {
    if (!hasOrgPermission(context.role, { integration: ["manage"] })) {
      throw new AppError("FORBIDDEN");
    }
    const data = await fetchUserData();
    return {
      balanceUsd: data?.money?.balance ?? null,
      checkedAt: new Date().toISOString(),
    };
  });
