import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  projectTasks,
  rankTrackingConfigs,
  rankTrackingKeywords,
} from "@/db/schema";
import type {
  ProjectTaskFields,
  ProjectTaskPatch,
} from "@/types/schemas/project-tasks";

async function listTasks(projectId: string) {
  return db
    .select({
      id: projectTasks.id,
      title: projectTasks.title,
      reason: projectTasks.reason,
      trackingKeywordId: projectTasks.trackingKeywordId,
      keyword: rankTrackingKeywords.keyword,
      pageUrl: projectTasks.pageUrl,
      status: projectTasks.status,
      assignee: projectTasks.assignee,
      createdAt: projectTasks.createdAt,
      completedAt: projectTasks.completedAt,
    })
    .from(projectTasks)
    .leftJoin(
      rankTrackingKeywords,
      eq(rankTrackingKeywords.id, projectTasks.trackingKeywordId),
    )
    .where(eq(projectTasks.projectId, projectId))
    .orderBy(desc(projectTasks.createdAt));
}

/** Whether the keyword belongs to one of the project's trackers. */
async function keywordInProject(projectId: string, trackingKeywordId: string) {
  const rows = await db
    .select({ id: rankTrackingKeywords.id })
    .from(rankTrackingKeywords)
    .innerJoin(
      rankTrackingConfigs,
      eq(rankTrackingConfigs.id, rankTrackingKeywords.configId),
    )
    .where(
      and(
        eq(rankTrackingKeywords.id, trackingKeywordId),
        eq(rankTrackingConfigs.projectId, projectId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function createTask(
  projectId: string,
  fields: Omit<ProjectTaskFields, "projectId">,
) {
  const id = crypto.randomUUID();
  await db.insert(projectTasks).values({ id, projectId, ...fields });
  return { id };
}

async function updateTask(
  projectId: string,
  taskId: string,
  patch: ProjectTaskPatch & { completedAt?: string | null },
) {
  const updated = await db
    .update(projectTasks)
    .set(patch)
    .where(
      and(eq(projectTasks.id, taskId), eq(projectTasks.projectId, projectId)),
    )
    .returning({ id: projectTasks.id });
  return updated.length > 0;
}

async function deleteTask(projectId: string, taskId: string) {
  const deleted = await db
    .delete(projectTasks)
    .where(
      and(eq(projectTasks.id, taskId), eq(projectTasks.projectId, projectId)),
    )
    .returning({ id: projectTasks.id });
  return deleted.length > 0;
}

export const ProjectTaskRepository = {
  listTasks,
  keywordInProject,
  createTask,
  updateTask,
  deleteTask,
};
