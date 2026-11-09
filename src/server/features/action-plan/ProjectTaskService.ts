import { ProjectTaskRepository } from "@/server/features/action-plan/ProjectTaskRepository";
import { AppError } from "@/server/lib/errors";
import type {
  ProjectTaskFields,
  ProjectTaskPatch,
} from "@/types/schemas/project-tasks";

async function requireKeywordInProject(
  projectId: string,
  trackingKeywordId: string | null | undefined,
) {
  if (!trackingKeywordId) return;
  const found = await ProjectTaskRepository.keywordInProject(
    projectId,
    trackingKeywordId,
  );
  if (!found) {
    throw new AppError("NOT_FOUND", "Palavra não encontrada neste projeto");
  }
}

async function createTask(
  projectId: string,
  fields: Omit<ProjectTaskFields, "projectId">,
) {
  await requireKeywordInProject(projectId, fields.trackingKeywordId);
  return ProjectTaskRepository.createTask(projectId, fields);
}

async function updateTask(
  projectId: string,
  taskId: string,
  patch: ProjectTaskPatch,
) {
  await requireKeywordInProject(projectId, patch.trackingKeywordId);
  const completedAt =
    patch.status === undefined
      ? {}
      : {
          completedAt:
            patch.status === "done" ? new Date().toISOString() : null,
        };
  const updated = await ProjectTaskRepository.updateTask(projectId, taskId, {
    ...patch,
    ...completedAt,
  });
  if (!updated) throw new AppError("NOT_FOUND", "Tarefa não encontrada");
}

async function deleteTask(projectId: string, taskId: string) {
  const deleted = await ProjectTaskRepository.deleteTask(projectId, taskId);
  if (!deleted) throw new AppError("NOT_FOUND", "Tarefa não encontrada");
}

export const ProjectTaskService = {
  listTasks: ProjectTaskRepository.listTasks,
  createTask,
  updateTask,
  deleteTask,
};
