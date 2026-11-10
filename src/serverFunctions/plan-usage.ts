import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { getAuthMode } from "@/lib/auth-mode";
import { hasOrgPermission } from "@/lib/org-permissions";
import { PlatformService } from "@/server/features/platform/PlatformService";
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
    // With partners (accounts mode) the key is the platform owner's, so only
    // they see its balance.
    const allowed =
      getAuthMode(env.AUTH_MODE) === "password"
        ? await PlatformService.isPlatformAdmin(context.userId)
        : hasOrgPermission(context.role, { integration: ["manage"] });
    if (!allowed) throw new AppError("FORBIDDEN");
    const data = await fetchUserData();
    return {
      balanceUsd: data?.money?.balance ?? null,
      checkedAt: new Date().toISOString(),
    };
  });
