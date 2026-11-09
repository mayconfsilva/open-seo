import { createServerFn } from "@tanstack/react-start";
import { ProjectTaskService } from "@/server/features/action-plan/ProjectTaskService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  createProjectTaskSchema,
  deleteProjectTaskSchema,
  listProjectTasksSchema,
  updateProjectTaskSchema,
} from "@/types/schemas/project-tasks";

export const listProjectTasks = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(listProjectTasksSchema)
  .handler(async ({ context }) =>
    ProjectTaskService.listTasks(context.projectId),
  );

export const createProjectTask = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(createProjectTaskSchema)
  .handler(async ({ data, context }) => {
    const { projectId: _projectId, ...fields } = data;
    return ProjectTaskService.createTask(context.projectId, fields);
  });

export const updateProjectTask = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(updateProjectTaskSchema)
  .handler(async ({ data, context }) =>
    ProjectTaskService.updateTask(context.projectId, data.taskId, data.patch),
  );

export const deleteProjectTask = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(deleteProjectTaskSchema)
  .handler(async ({ data, context }) =>
    ProjectTaskService.deleteTask(context.projectId, data.taskId),
  );
