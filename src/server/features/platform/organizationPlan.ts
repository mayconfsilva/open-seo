import { DEFAULT_PLAN, UNLIMITED_PLAN } from "@/shared/plan-usage";
import { PlatformRepository } from "./PlatformRepository";

/**
 * The organization's plan: unlimited for the platform owner's own
 * organization, otherwise the assigned plan or the default one.
 */
export async function getOrganizationPlan(
  organizationId: string,
): Promise<{ name: string; monthlyQueries: number | null }> {
  const [settings, ownerOrganizations] = await Promise.all([
    PlatformRepository.getOrganizationSettings(organizationId),
    PlatformRepository.listPlatformOwnerOrganizationIds(),
  ]);
  if (ownerOrganizations.includes(organizationId)) return UNLIMITED_PLAN;
  if (settings?.planName != null && settings.monthlyQueries != null) {
    return { name: settings.planName, monthlyQueries: settings.monthlyQueries };
  }
  return DEFAULT_PLAN;
}
