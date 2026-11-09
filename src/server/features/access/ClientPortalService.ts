import { ProjectTaskRepository } from "@/server/features/action-plan/ProjectTaskRepository";
import { ProjectAccessService } from "@/server/features/access/ProjectAccessService";
import { PortfolioService } from "@/server/features/portfolio/PortfolioService";
import { ProjectSetupService } from "@/server/features/project-setup/ProjectSetupService";
import { RankCompetitorService } from "@/server/features/rank-tracking/services/RankCompetitorService";
import { RankTrackingService } from "@/server/features/rank-tracking/services/RankTrackingService";
import type { EnsuredProject } from "@/middleware/ensure-user/types";

type Caller = { userId: string; organizationId: string; role: string };

/** The projects a caller can open in the portal, finished ones only. */
async function listProjects(caller: Caller) {
  const ids = await ProjectAccessService.listPortalProjectIds(caller);
  const projects = await PortfolioService.list(caller.organizationId, ids);
  return projects.filter((project) => !project.draft);
}

/**
 * One project, read-only: positions on the main device, competitors from the
 * same check and the action plan. Nothing here changes data or calls a paid
 * provider.
 */
async function getProject(caller: Caller, project: EnsuredProject) {
  await ProjectAccessService.requirePortalProject(caller, project.id);
  const [config, tasks] = await Promise.all([
    ProjectSetupService.findMainConfig(project),
    ProjectTaskRepository.listTasks(project.id),
  ]);
  const base = {
    project: { id: project.id, name: project.name, domain: project.domain },
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      reason: task.reason,
      status: task.status,
      keyword: task.keyword,
    })),
  };
  if (!config) {
    return {
      ...base,
      device: null,
      lastCheckedAt: null,
      keywords: [],
      competitors: [],
    };
  }

  const device = config.devices === "desktop" ? "desktop" : "mobile";
  const [{ results }, rivals] = await Promise.all([
    RankTrackingService.getTracker(config.id, project.id),
    RankCompetitorService.getCompetitorPositions(config.id, project.id),
  ]);
  const keywords = results.rows.map((row) => ({
    id: row.trackingKeywordId,
    keyword: row.keyword,
    position: row[device].position,
    previousPosition: row[device].previousPosition,
    url: row[device].rankingUrl,
  }));
  const competitors = rivals.domains.map((domain) => ({
    domain,
    top10: rivals.positions.filter(
      (entry) =>
        entry.domain === domain &&
        entry.device === device &&
        entry.position <= 10,
    ).length,
  }));
  return {
    ...base,
    device,
    lastCheckedAt: config.lastCheckedAt,
    keywords,
    competitors,
  };
}

export const ClientPortalService = { listProjects, getProject };
