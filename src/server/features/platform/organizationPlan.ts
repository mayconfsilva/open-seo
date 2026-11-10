import { DEFAULT_PLAN } from "@/shared/plan-usage";
import { PlatformRepository } from "./PlatformRepository";

/** The organization's plan, or the default one when none is assigned. */
export async function getOrganizationPlan(organizationId: string) {
  const settings =
    await PlatformRepository.getOrganizationSettings(organizationId);
  if (settings?.planName != null && settings.monthlyQueries != null) {
    return { name: settings.planName, monthlyQueries: settings.monthlyQueries };
  }
  return DEFAULT_PLAN;
}
