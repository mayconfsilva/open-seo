import { useState } from "react";
import { CircleCheck, Flag, Loader, MoreHorizontal, Plus } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/client/components/ui/button";
import { Skeleton } from "@/client/components/ui/skeleton";
import { QueryError } from "@/client/components/QueryState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import {
  PROJECT_TASK_STATUSES,
  type ProjectTaskStatus,
} from "@/types/schemas/project-tasks";
import {
  STATUS_LABELS,
  useMainTrackerData,
  useProjectTasks,
  useTaskMutations,
  type ProjectTask,
} from "./actionPlanQueries";
import { buildActionSuggestions } from "./actionSuggestions";
import { SuggestionList } from "./SuggestionList";
import { TaskDialog } from "./TaskDialog";

const COLUMN_STYLE: Record<
  ProjectTaskStatus,
  { icon: typeof Flag; className: string }
> = {
  todo: { icon: Flag, className: "text-muted-foreground" },
  doing: { icon: Loader, className: "text-primary" },
  done: { icon: CircleCheck, className: "text-up" },
};

type DialogState = { mode: "create" } | { mode: "edit"; task: ProjectTask };

/**
 * dataSEO "Plano de ação": the manual SEO tasks of the project, in three
 * columns by status, plus suggestions built from the latest rank check.
 */
export function ActionPlanPage({
  projectId,
  domain,
}: {
  projectId: string;
  domain: string | null;
}) {
  const tasksQuery = useProjectTasks(projectId);
  const tracker = useMainTrackerData(projectId, domain);
  const mutations = useTaskMutations(projectId);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const tasks = tasksQuery.data ?? [];
  const keywords = tracker.rows.map((row) => ({
    id: row.trackingKeywordId,
    keyword: row.keyword,
  }));
  const suggestions = buildActionSuggestions({
    rows: tracker.rows,
    device: tracker.device,
    competitors: tracker.competitors,
    plannedKeywordIds: new Set(
      tasks.flatMap((task) =>
        task.trackingKeywordId ? [task.trackingKeywordId] : [],
      ),
    ),
  });
  const doing = tasks.filter((task) => task.status === "doing").length;

  return (
    <div className="px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-semibold tracking-[-.01em]">
              Plano de ação
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {tasks.length} tarefa{tasks.length === 1 ? "" : "s"} · {doing} em
              andamento
            </p>
          </div>
          <Button onClick={() => setDialog({ mode: "create" })}>
            <Plus data-icon="inline-start" />
            Nova tarefa
          </Button>
        </div>

        {tasksQuery.isError ? (
          <QueryError
            error={tasksQuery.error}
            fallback="Não foi possível carregar o plano de ação"
            onRetry={() => void tasksQuery.refetch()}
            isRetrying={tasksQuery.isFetching}
          />
        ) : tasksQuery.isPending ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <>
            {suggestions.length > 0 ? (
              <SuggestionList
                suggestions={suggestions}
                pending={mutations.create.isPending}
                onAdd={(suggestion) =>
                  mutations.create.mutate({
                    title: suggestion.title,
                    reason: suggestion.reason,
                    trackingKeywordId: suggestion.trackingKeywordId,
                    pageUrl: suggestion.pageUrl,
                    assignee: null,
                  })
                }
              />
            ) : null}
            <div className="grid gap-4 lg:grid-cols-3">
              {PROJECT_TASK_STATUSES.map((status) => (
                <TaskColumn
                  key={status}
                  status={status}
                  tasks={tasks.filter((task) => task.status === status)}
                  onMove={(task, next) =>
                    mutations.update.mutate({
                      taskId: task.id,
                      patch: { status: next },
                    })
                  }
                  onEdit={(task) => setDialog({ mode: "edit", task })}
                  onDelete={(task) => mutations.remove.mutate(task.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {dialog ? (
        <TaskDialog
          title={dialog.mode === "create" ? "Nova tarefa" : "Editar tarefa"}
          initial={dialog.mode === "edit" ? dialog.task : undefined}
          keywords={keywords}
          pending={mutations.create.isPending || mutations.update.isPending}
          onSubmit={(input) => {
            const done = { onSuccess: () => setDialog(null) };
            if (dialog.mode === "create") {
              mutations.create.mutate(input, done);
            } else {
              mutations.update.mutate(
                { taskId: dialog.task.id, patch: input },
                done,
              );
            }
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}

function TaskColumn({
  status,
  tasks,
  onMove,
  onEdit,
  onDelete,
}: {
  status: ProjectTaskStatus;
  tasks: ProjectTask[];
  onMove: (task: ProjectTask, status: ProjectTaskStatus) => void;
  onEdit: (task: ProjectTask) => void;
  onDelete: (task: ProjectTask) => void;
}) {
  const { icon: Icon, className } = COLUMN_STYLE[status];
  return (
    <section className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4">
      <h2
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-semibold tracking-[.06em] uppercase",
          className,
        )}
      >
        <Icon className="size-3.5" />
        {STATUS_LABELS[status]}
        <span className="ml-auto font-normal text-muted-foreground tabular-nums">
          {tasks.length}
        </span>
      </h2>
      {tasks.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] text-muted-foreground">
          Nada aqui ainda.
        </p>
      ) : null}
      {tasks.map((task) => (
        <article
          key={task.id}
          className="flex flex-col gap-1 rounded-md border border-hairline bg-subtle px-3 py-2.5"
        >
          <div className="flex items-start gap-2">
            <span className="flex-1 text-[13.5px] leading-snug font-medium">
              {task.title}
            </span>
            <TaskMenu
              task={task}
              onMove={onMove}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
          {task.reason ? (
            <p className="line-clamp-3 text-[12px] leading-relaxed text-muted-foreground">
              {task.reason}
            </p>
          ) : null}
          <p className="text-[11.5px] text-muted-foreground">
            {[
              task.keyword ? `«${task.keyword}»` : null,
              task.pageUrl,
              task.assignee,
              task.completedAt
                ? `concluída em ${formatDate(task.completedAt)}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </article>
      ))}
    </section>
  );
}

function TaskMenu({
  task,
  onMove,
  onEdit,
  onDelete,
}: {
  task: ProjectTask;
  onMove: (task: ProjectTask, status: ProjectTaskStatus) => void;
  onEdit: (task: ProjectTask) => void;
  onDelete: (task: ProjectTask) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Ações da tarefa ${task.title}`}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {PROJECT_TASK_STATUSES.filter((status) => status !== task.status).map(
          (status) => (
            <DropdownMenuItem key={status} onClick={() => onMove(task, status)}>
              Mover para {STATUS_LABELS[status].toLowerCase()}
            </DropdownMenuItem>
          ),
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onEdit(task)}>Editar</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDelete(task)}
          className="text-destructive"
        >
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}
