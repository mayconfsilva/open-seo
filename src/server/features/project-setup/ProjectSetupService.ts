import type { BillingCustomerContext } from "@/server/billing/subscription";
import { DashboardFirstAuditService } from "@/server/features/dashboard/services/DashboardFirstAuditService";
import { ProjectService } from "@/server/features/projects/services/ProjectService";
import { ProjectSetupRepository } from "@/server/features/project-setup/ProjectSetupRepository";
import { RankKeywordGroupRepository } from "@/server/features/rank-tracking/repositories/RankKeywordGroupRepository";
import { RankTrackingRepository } from "@/server/features/rank-tracking/repositories/RankTrackingRepository";
import { RankTrackingService } from "@/server/features/rank-tracking/services/RankTrackingService";
import { normalizeBacklinksTarget } from "@/server/lib/dataforseoBacklinksTarget";
import { AppError } from "@/server/lib/errors";
import type { EnsuredProject } from "@/middleware/ensure-user/types";
import { getLanguageCode } from "@/shared/keyword-locations";
import type {
  SetupBusiness,
  SetupCompetitor,
  SetupMarket,
} from "@/types/schemas/project-setup";

/** Results deep enough to see competitors, cheap enough for a first check. */
const SETUP_SERP_DEPTH = 20;

function dedupe(values: string[]) {
  return [...new Set(values)];
}

async function saveBusinessDetails(projectId: string, input: SetupBusiness) {
  await ProjectSetupRepository.setBusiness(projectId, {
    segment: input.segment,
    audience: input.audience,
  });
  await ProjectSetupRepository.replaceServices(
    projectId,
    dedupe(input.services),
  );
}

/**
 * Step 1 of the new-project wizard on a new project: it starts as a draft, so
 * no audit, check or metrics call runs until the review step is confirmed.
 */
async function createDraft(organizationId: string, input: SetupBusiness) {
  const project = await ProjectService.createProject(organizationId, {
    name: input.name,
    domain: input.domain,
  });
  await ProjectSetupRepository.setBusiness(project.id, {
    segment: input.segment,
    audience: input.audience,
    draftSince: new Date().toISOString(),
  });
  await ProjectSetupRepository.replaceServices(
    project.id,
    dedupe(input.services),
  );
  return { projectId: project.id };
}

/** The tracker the wizard sets up: the one for the project's own domain. */
async function findMainConfig(project: { id: string; domain: string | null }) {
  const configs = await RankTrackingService.getConfigs(project.id);
  return (
    configs.find((config) => config.domain === project.domain) ??
    configs.at(0) ??
    null
  );
}

async function saveBusiness(project: EnsuredProject, input: SetupBusiness) {
  const updated = await ProjectService.updateProject(project.organizationId, {
    projectId: project.id,
    name: input.name,
    domain: input.domain,
  });
  await saveBusinessDetails(project.id, input);
  // A domain fixed after the market step moves the draft's tracker with it.
  const config = await findMainConfig(project);
  if (config && updated.domain && config.domain !== updated.domain) {
    await RankTrackingService.updateConfig(config.id, project.id, {
      domain: updated.domain,
    });
  }
}

async function saveMarket(project: EnsuredProject, input: SetupMarket) {
  if (!project.domain) {
    throw new AppError("VALIDATION_ERROR", "Informe o domínio do site antes");
  }
  await ProjectService.updateProject(project.organizationId, {
    projectId: project.id,
    name: project.name,
    domain: project.domain,
    // The project keeps the country's own language (its research tools only
    // serve those); the tracker can search in any language.
    locationCode: input.locationCode,
    languageCode: getLanguageCode(input.locationCode),
  });
  const market = {
    locationCode: input.locationCode,
    languageCode: input.languageCode,
    locationName: input.locationName ?? undefined,
    devices: input.devices,
  };
  const config = await findMainConfig(project);
  if (config) {
    await RankTrackingService.updateConfig(config.id, project.id, market);
    return { configId: config.id };
  }
  // Manual until the review step, so the scheduler leaves the draft alone.
  const created = await RankTrackingService.createConfig({
    projectId: project.id,
    projectMarket: project,
    domain: project.domain,
    serpDepth: SETUP_SERP_DEPTH,
    scheduleInterval: "manual",
    ...market,
  });
  return { configId: created.id };
}

async function requireMainConfig(project: EnsuredProject) {
  const config = await findMainConfig(project);
  if (!config) {
    throw new AppError("VALIDATION_ERROR", "Defina o mercado antes");
  }
  return config;
}

/**
 * Add keywords to the draft's tracker, optionally in a group (created by name
 * when new) and with a target page. Keywords already on the list keep their
 * row; they only move to the group or page given.
 */
async function addKeywords(
  project: EnsuredProject,
  input: { keywords: string[]; group: string | null; targetUrl: string | null },
) {
  const config = await requireMainConfig(project);
  const result = await RankTrackingService.addKeywords(
    config.id,
    project.id,
    input.keywords,
    { kind: "direct_user_action" },
  );
  if (!input.group && !input.targetUrl) return { added: result.added };

  const wanted = new Set(input.keywords.map((kw) => kw.trim().toLowerCase()));
  const keywordIds = (
    await RankTrackingRepository.getKeywordsForConfig(config.id)
  )
    .filter((kw) => wanted.has(kw.keyword.toLowerCase()))
    .map((kw) => kw.id);
  let groupId: string | undefined;
  if (input.group) {
    const groups = await RankKeywordGroupRepository.listGroups(config.id);
    groupId =
      groups.find((group) => group.name === input.group)?.id ??
      (await RankKeywordGroupRepository.createGroup(config.id, input.group)).id;
  }
  await RankKeywordGroupRepository.updateKeywords(config.id, keywordIds, {
    ...(groupId ? { groupId } : {}),
    ...(input.targetUrl ? { targetUrl: input.targetUrl } : {}),
  });
  return { added: result.added };
}

async function saveCompetitors(
  project: EnsuredProject,
  competitors: SetupCompetitor[],
) {
  const normalized = competitors.map((competitor) => {
    try {
      return {
        ...competitor,
        domain: normalizeBacklinksTarget(competitor.domain, {
          scope: "domain",
        }).apiTarget,
      };
    } catch {
      throw new AppError(
        "VALIDATION_ERROR",
        `Domínio inválido: ${competitor.domain}`,
      );
    }
  });
  const own = project.domain;
  const unique = new Map(
    normalized
      .filter((competitor) => competitor.domain !== own)
      .map((competitor) => [competitor.domain, competitor]),
  );
  await ProjectSetupRepository.replaceCompetitors(project.id, [
    ...unique.values(),
  ]);
}

async function getSetup(project: EnsuredProject) {
  const config = await findMainConfig(project);
  const [services, competitors, keywords, groups] = await Promise.all([
    ProjectSetupRepository.listServices(project.id),
    ProjectSetupRepository.listCompetitors(project.id),
    config ? RankTrackingRepository.getKeywordsForConfig(config.id) : [],
    config ? RankKeywordGroupRepository.listGroups(config.id) : [],
  ]);
  const groupNames = new Map(groups.map((group) => [group.id, group.name]));
  return {
    project: {
      id: project.id,
      name: project.name,
      domain: project.domain,
      segment: project.segment,
      audience: project.audience,
      draftSince: project.draftSince,
      locationCode: project.locationCode,
      languageCode: project.languageCode,
    },
    services,
    config: config
      ? {
          id: config.id,
          locationCode: config.locationCode,
          languageCode: config.languageCode,
          locationName: config.locationName,
          devices: config.devices,
          serpDepth: config.serpDepth,
          scheduleInterval: config.scheduleInterval,
        }
      : null,
    keywords: keywords.map((kw) => ({
      id: kw.id,
      keyword: kw.keyword,
      group: kw.groupId ? (groupNames.get(kw.groupId) ?? null) : null,
      targetUrl: kw.targetUrl,
    })),
    competitors,
  };
}

/**
 * The review step: the project leaves draft, gets its schedule and devices,
 * and its first audit, keyword metrics and rank check start.
 */
async function confirm(
  project: EnsuredProject,
  customer: BillingCustomerContext,
  input: {
    scheduleInterval: "daily" | "weekly" | "monthly";
    devices: "both" | "desktop" | "mobile";
  },
) {
  const config = await requireMainConfig(project);
  const keywords = await RankTrackingRepository.getKeywordsForConfig(config.id);
  if (keywords.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Adicione ao menos uma palavra");
  }
  await RankTrackingService.updateConfig(config.id, project.id, {
    scheduleInterval: input.scheduleInterval,
    devices: input.devices,
  });
  await ProjectSetupRepository.setBusiness(project.id, {
    segment: project.segment,
    audience: project.audience,
    draftSince: null,
  });
  await DashboardFirstAuditService.start(project.id, project.domain, customer);
  try {
    await RankTrackingService.refreshKeywordMetrics(
      config.id,
      project.id,
      customer,
    );
  } catch (error) {
    // Volume and difficulty are a nice-to-have; the check matters more.
    console.warn("[project-setup] metrics refresh failed:", error);
  }
  const check = await RankTrackingService.triggerCheck({
    configId: config.id,
    projectId: project.id,
    billingCustomer: customer,
  });
  return { configId: config.id, check };
}

export const ProjectSetupService = {
  findMainConfig,
  createDraft,
  saveBusiness,
  saveMarket,
  addKeywords,
  saveCompetitors,
  getSetup,
  confirm,
};
