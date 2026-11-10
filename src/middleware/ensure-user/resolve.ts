import { env } from "cloudflare:workers";
import { getAuthMode, usesBetterAuth } from "@/lib/auth-mode";
import { resolveCloudflareAccessContext } from "./cloudflareAccess";
import { resolveLocalNoAuthContext } from "./delegated";
import { resolveEveryAppContext } from "./everyApp";
import { resolveHostedContext } from "./hosted";
import type { EnsuredUserContext } from "./types";
import { PlatformService } from "@/server/features/platform/PlatformService";
import { AppError } from "@/server/lib/errors";

// Resolves the authenticated user for a request's headers across every auth
// mode. Shared by ensureUserMiddleware (server functions) and raw API routes,
// which can't use function middleware.
export async function resolveUserContextFromHeaders(
  headers: Headers,
): Promise<EnsuredUserContext> {
  const authMode = getAuthMode(env.AUTH_MODE);
  if (authMode === "local_noauth") {
    return resolveLocalNoAuthContext();
  }
  if (usesBetterAuth(authMode)) {
    const context = await resolveHostedContext(headers);
    // dataSEO: a suspended organization is locked out until the platform
    // owner reactivates it; the owner is never locked out of their own app.
    if (
      authMode === "password" &&
      (await PlatformService.isOrganizationSuspended(context.organizationId)) &&
      !(await PlatformService.isPlatformAdmin(context.userId))
    ) {
      throw new AppError("ORGANIZATION_SUSPENDED");
    }
    return context;
  }
  if (authMode === "everyapp") {
    return resolveEveryAppContext(headers);
  }
  return resolveCloudflareAccessContext(headers);
}
