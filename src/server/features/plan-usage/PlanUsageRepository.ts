import { and, count, eq, gte, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  projects,
  rankCheckRuns,
  rankSnapshots,
  rankTrackingConfigs,
  rankTrackingKeywords,
} from "@/db/schema";

/**
 * Queries each project of the organization used between `from` (inclusive)
 * and `to`. One stored position is one query; archived projects still count.
 */
async function countQueriesByProject(
  organizationId: string,
  from: string,
  to: string,
) {
  return db
    .select({
      projectId: rankCheckRuns.projectId,
      queries: count(rankSnapshots.id),
    })
    .from(rankSnapshots)
    .innerJoin(rankCheckRuns, eq(rankSnapshots.runId, rankCheckRuns.id))
    .innerJoin(projects, eq(rankCheckRuns.projectId, projects.id))
    .where(
      and(
        eq(projects.organizationId, organizationId),
        gte(rankSnapshots.checkedAt, from),
        lt(rankSnapshots.checkedAt, to),
      ),
    )
    .groupBy(rankCheckRuns.projectId);
}

/** Every project of the organization, archived ones included. */
async function listProjects(organizationId: string) {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      domain: projects.domain,
      archivedAt: projects.archivedAt,
      draftSince: projects.draftSince,
    })
    .from(projects)
    .where(eq(projects.organizationId, organizationId));
}

/** The active trackers of the organization's live projects, with keyword counts. */
async function listActiveTrackers(organizationId: string) {
  return db
    .select({
      projectId: rankTrackingConfigs.projectId,
      devices: rankTrackingConfigs.devices,
      scheduleInterval: rankTrackingConfigs.scheduleInterval,
      nextCheckAt: rankTrackingConfigs.nextCheckAt,
      keywords: count(rankTrackingKeywords.id),
    })
    .from(rankTrackingConfigs)
    .innerJoin(projects, eq(rankTrackingConfigs.projectId, projects.id))
    .leftJoin(
      rankTrackingKeywords,
      eq(rankTrackingKeywords.configId, rankTrackingConfigs.id),
    )
    .where(
      and(
        eq(projects.organizationId, organizationId),
        eq(rankTrackingConfigs.isActive, true),
        isNull(projects.archivedAt),
        isNull(projects.draftSince),
      ),
    )
    .groupBy(
      rankTrackingConfigs.id,
      rankTrackingConfigs.projectId,
      rankTrackingConfigs.devices,
      rankTrackingConfigs.scheduleInterval,
      rankTrackingConfigs.nextCheckAt,
    );
}

export const PlanUsageRepository = {
  countQueriesByProject,
  listProjects,
  listActiveTrackers,
};
