import { z } from "zod";

export const PROJECT_TASK_STATUSES = ["todo", "doing", "done"] as const;
export type ProjectTaskStatus = (typeof PROJECT_TASK_STATUSES)[number];

const projectScope = { projectId: z.string().uuid() };
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable();
const pageUrl = optionalText(2048).refine(
  (value) => value === null || value.startsWith("/") || URL.canParse(value),
  "Use um caminho como /servicos ou um endereço completo",
);

const taskFields = {
  title: z.string().trim().min(1).max(200),
  reason: optionalText(1000),
  trackingKeywordId: z.string().uuid().nullable(),
  pageUrl,
  assignee: optionalText(80),
};

export const listProjectTasksSchema = z.object(projectScope);

export const createProjectTaskSchema = z.object({
  ...projectScope,
  ...taskFields,
});

export const updateProjectTaskSchema = z.object({
  ...projectScope,
  taskId: z.string().uuid(),
  patch: z
    .object({ ...taskFields, status: z.enum(PROJECT_TASK_STATUSES) })
    .partial(),
});

export const deleteProjectTaskSchema = z.object({
  ...projectScope,
  taskId: z.string().uuid(),
});

export type ProjectTaskFields = z.infer<typeof createProjectTaskSchema>;
export type ProjectTaskPatch = z.infer<typeof updateProjectTaskSchema>["patch"];
