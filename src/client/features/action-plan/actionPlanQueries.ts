import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  createProjectTask,
  deleteProjectTask,
  listProjectTasks,
  updateProjectTask,
} from "@/serverFunctions/project-tasks";
import { getRankCompetitorPositions } from "@/serverFunctions/rank-competitors";
import {
  getLatestRankResults,
  getRankTrackingConfigs,
} from "@/serverFunctions/rank-tracking";
import type { ProjectTaskStatus } from "@/types/schemas/project-tasks";

export type ProjectTask = Awaited<ReturnType<typeof listProjectTasks>>[number];

export interface TaskInput {
  title: string;
  reason: string | null;
  trackingKeywordId: string | null;
  pageUrl: string | null;
  assignee: string | null;
}

export const STATUS_LABELS: Record<ProjectTaskStatus, string> = {
  todo: "Próximos passos",
  doing: "Em andamento",
  done: "Entregue",
};

function projectTasksQueryKey(projectId: string) {
  return ["projectTasks", projectId];
}

export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: projectTasksQueryKey(projectId),
    queryFn: () => listProjectTasks({ data: { projectId } }),
  });
}

export function useTaskMutations(projectId: string) {
  const queryClient = useQueryClient();
  const onSuccess = () =>
    void queryClient.invalidateQueries({
      queryKey: projectTasksQueryKey(projectId),
    });
  const onError = (error: unknown) =>
    toast.error(getStandardErrorMessage(error));
  return {
    create: useMutation({
      mutationFn: (input: TaskInput) =>
        createProjectTask({ data: { projectId, ...input } }),
      onSuccess: () => {
        onSuccess();
        toast.success("Tarefa adicionada ao plano");
      },
      onError,
    }),
    update: useMutation({
      mutationFn: (vars: {
        taskId: string;
        patch: Partial<TaskInput> & { status?: ProjectTaskStatus };
      }) => updateProjectTask({ data: { projectId, ...vars } }),
      onSuccess,
      onError,
    }),
    remove: useMutation({
      mutationFn: (taskId: string) =>
        deleteProjectTask({ data: { projectId, taskId } }),
      onSuccess: () => {
        onSuccess();
        toast.success("Tarefa excluída");
      },
      onError,
    }),
  };
}

/**
 * The project's main tracker (the one for the project's own domain), its
 * latest rows and competitor positions: the inputs of the suggestions.
 */
export function useMainTrackerData(projectId: string, domain: string | null) {
  const configsQuery = useQuery({
    queryKey: ["rankTrackingConfigs", projectId],
    queryFn: () => getRankTrackingConfigs({ data: { projectId } }),
  });
  const configs = configsQuery.data ?? [];
  const main =
    configs.find((config) => domain && config.domain === domain) ??
    configs.at(0);
  const latestQuery = useQuery({
    queryKey: ["rankLatestResults", projectId, main?.id, "90d"],
    queryFn: () =>
      getLatestRankResults({
        data: { projectId, configId: main?.id ?? "", comparePeriod: "90d" },
      }),
    enabled: main !== undefined,
  });
  const competitorsQuery = useQuery({
    queryKey: ["rankCompetitorPositions", projectId, main?.id],
    queryFn: () =>
      getRankCompetitorPositions({
        data: { projectId, configId: main?.id ?? "" },
      }),
    enabled: main !== undefined,
  });
  return {
    main,
    device:
      main?.devices === "desktop" ? ("desktop" as const) : ("mobile" as const),
    rows: latestQuery.data?.rows ?? [],
    competitors: competitorsQuery.data?.positions ?? [],
    isPending:
      configsQuery.isPending ||
      (main !== undefined &&
        (latestQuery.isPending || competitorsQuery.isPending)),
  };
}
