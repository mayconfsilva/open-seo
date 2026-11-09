import { Link } from "@tanstack/react-router";
import { sortBy } from "remeda";
import type { RankTrackingRow } from "@/types/schemas/rank-tracking";
import { STATUS_LABELS, useProjectTasks } from "./actionPlanQueries";
import {
  buildActionSuggestions,
  type CompetitorPosition,
} from "./actionSuggestions";

const SHOWN = 3;

interface AttentionItem {
  key: string;
  title: string;
  why: string;
  tag: string;
  planned: boolean;
  source: string;
}

/**
 * dataSEO "O que precisa da sua atenção" (board 3a): open tasks of the action
 * plan first, then suggestions from the latest check.
 */
export function AttentionCard({
  projectId,
  rows,
  device,
  competitors,
}: {
  projectId: string;
  rows: RankTrackingRow[];
  device: "desktop" | "mobile";
  competitors: CompetitorPosition[];
}) {
  const tasksQuery = useProjectTasks(projectId);
  const tasks = tasksQuery.data ?? [];
  const open = sortBy(
    tasks.filter((task) => task.status !== "done"),
    (task) => (task.status === "doing" ? 0 : 1),
  );
  const suggestions = buildActionSuggestions({
    rows,
    device,
    competitors,
    plannedKeywordIds: new Set(
      tasks.flatMap((task) =>
        task.trackingKeywordId ? [task.trackingKeywordId] : [],
      ),
    ),
  });
  const items: AttentionItem[] = [
    ...open.map((task) => ({
      key: task.id,
      title: task.title,
      why: task.reason ?? "",
      tag: [STATUS_LABELS[task.status], task.assignee]
        .filter(Boolean)
        .join(" · "),
      planned: true,
      source: "Plano de ação",
    })),
    ...suggestions.map((suggestion) => ({
      key: suggestion.trackingKeywordId,
      title: suggestion.title,
      why: suggestion.reason,
      tag: "Sugestão",
      planned: false,
      source: suggestion.source,
    })),
  ];

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-1.5">
        <h2 className="text-[15px] font-semibold">
          O que precisa da sua atenção
        </h2>
        {items.length > 0 ? (
          <span className="text-[12px] text-muted-foreground">
            {Math.min(SHOWN, items.length)} de {items.length}
          </span>
        ) : null}
      </div>
      {tasksQuery.isPending ? null : items.length === 0 ? (
        <p className="px-4 pb-3 text-[12.5px] text-muted-foreground">
          Nada pendente. As sugestões aparecem aqui depois de cada coleta.
        </p>
      ) : (
        <ol>
          {items.slice(0, SHOWN).map((item, index) => (
            <li
              key={item.key}
              className="grid grid-cols-[22px_minmax(0,1fr)] gap-2.5 border-t border-hairline px-4 py-3"
            >
              <span className="grid size-[22px] place-items-center rounded-full bg-accent text-[12px] font-semibold text-primary">
                {index + 1}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[13.5px] leading-snug font-medium">
                  {item.title}
                </span>
                {item.why ? (
                  <span className="line-clamp-3 text-[12px] leading-relaxed text-muted-foreground">
                    {item.why}
                  </span>
                ) : null}
                <span className="flex flex-wrap gap-1.5 text-[11px]">
                  <span
                    className={
                      item.planned
                        ? "rounded bg-up-soft px-1.5 py-0.5 font-medium text-up"
                        : "rounded bg-accent px-1.5 py-0.5 font-medium text-primary"
                    }
                  >
                    {item.tag}
                  </span>
                  <span className="rounded bg-background px-1.5 py-0.5 text-muted-foreground">
                    {item.source}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="border-t border-hairline px-4 py-2.5">
        <Link
          to="/p/$projectId/plan"
          params={{ projectId }}
          className="text-[13px] text-primary underline underline-offset-2"
        >
          Abrir plano de ação
        </Link>
      </div>
    </div>
  );
}
