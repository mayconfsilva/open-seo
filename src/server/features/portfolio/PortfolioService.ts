import { ProjectTaskRepository } from "@/server/features/action-plan/ProjectTaskRepository";
import { ProjectService } from "@/server/features/projects/services/ProjectService";
import { ProjectSetupService } from "@/server/features/project-setup/ProjectSetupService";
import { RankTrackingService } from "@/server/features/rank-tracking/services/RankTrackingService";

/** How many dropped keywords each project names in the attention list. */
const DROPPED_SAMPLE = 3;

/**
 * The carteira (board 4a): one line per project in the organization with
 * its top 10 count, open tasks and last check. Reads stored results only.
 */
async function list(organizationId: string) {
  const projects = await ProjectService.listProjects(organizationId);
  return Promise.all(projects.map((project) => summarize(project)));
}

async function summarize(project: {
  id: string;
  name: string;
  domain: string | null;
  draftSince: string | null;
}) {
  const [config, tasks] = await Promise.all([
    ProjectSetupService.findMainConfig(project),
    ProjectTaskRepository.listTasks(project.id),
  ]);
  const base = {
    id: project.id,
    name: project.name,
    domain: project.domain,
    draft: project.draftSince !== null,
    openTasks: tasks.filter((task) => task.status !== "done").length,
  };
  if (!config) {
    return {
      ...base,
      keywords: 0,
      top10: 0,
      prevTop10: 0,
      dropped: [],
      droppedCount: 0,
      lastCheckedAt: null,
      runStatus: null,
    };
  }

  const { results } = await RankTrackingService.getTracker(
    config.id,
    project.id,
  );
  const device = config.devices === "desktop" ? "desktop" : "mobile";
  let top10 = 0;
  let prevTop10 = 0;
  const dropped: string[] = [];
  for (const row of results.rows) {
    const { position, previousPosition } = row[device];
    if (position !== null && position <= 10) top10 += 1;
    if (previousPosition !== null && previousPosition <= 10) {
      prevTop10 += 1;
      if (position === null || position > 10) dropped.push(row.keyword);
    }
  }
  return {
    ...base,
    keywords: results.rows.length,
    top10,
    prevTop10,
    dropped: dropped.slice(0, DROPPED_SAMPLE),
    droppedCount: dropped.length,
    lastCheckedAt: config.lastCheckedAt,
    runStatus: results.run?.status ?? null,
  };
}

export const PortfolioService = { list };
