import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import type { ActionSuggestion } from "./actionSuggestions";

const COLLAPSED_COUNT = 4;

/** Suggested tasks from the latest check, each one click from the plan. */
export function SuggestionList({
  suggestions,
  pending,
  onAdd,
}: {
  suggestions: ActionSuggestion[];
  pending: boolean;
  onAdd: (suggestion: ActionSuggestion) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? suggestions : suggestions.slice(0, COLLAPSED_COUNT);
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-[15px] font-semibold">Sugestões das coletas</h2>
        <p className="text-[12.5px] text-muted-foreground">
          Observado na última coleta de posições · maior volume primeiro
        </p>
      </div>
      <ul>
        {shown.map((suggestion) => (
          <li
            key={suggestion.trackingKeywordId}
            className="flex items-start gap-3 border-t border-hairline px-4 py-3"
          >
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-[13.5px] leading-snug font-medium">
                {suggestion.title}
              </span>
              <span className="text-[12px] leading-relaxed text-muted-foreground">
                {suggestion.reason}
              </span>
              <span className="w-fit rounded bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {suggestion.source}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => onAdd(suggestion)}
            >
              <Plus data-icon="inline-start" />
              Adicionar ao plano
            </Button>
          </li>
        ))}
      </ul>
      {suggestions.length > COLLAPSED_COUNT ? (
        <div className="border-t border-hairline px-4 py-2.5">
          <button
            type="button"
            className="text-[13px] text-primary underline underline-offset-2"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded
              ? "Mostrar menos"
              : `Ver todas as ${suggestions.length} sugestões`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
