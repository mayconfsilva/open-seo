import { Link } from "@tanstack/react-router";
import {
  queryOptions,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ChevronRight, Lightbulb, Search, Sparkles } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { QueryError } from "@/client/components/QueryState";
import { Button } from "@/client/components/ui/button";
import { getErrorCode } from "@/client/lib/error-messages";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import {
  generateKeywordSuggestions,
  getKeywordSuggestions,
} from "@/serverFunctions/keywords";
import { KeywordSuggestionReason } from "@/shared/keyword-suggestions";

type KeywordSuggestionsData = Awaited<ReturnType<typeof getKeywordSuggestions>>;
type Suggestion = KeywordSuggestionsData["suggestions"][number];

// Most suggestions are the site's own topics, so only Search Console's are named.
const REASON_NOTES: Record<KeywordSuggestionReason, string | null> = {
  [KeywordSuggestionReason.CloseToTopThree]: "Perto do top 3",
  [KeywordSuggestionReason.CloseToPageOne]: "Perto da página 1",
  [KeywordSuggestionReason.FromYourSite]: null,
};

export const keywordSuggestionsQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: ["keywordSuggestions", projectId],
    queryFn: () => getKeywordSuggestions({ data: { projectId } }),
    // Topics change only when generated, and Search Console data daily.
    staleTime: 10 * 60_000,
  });

/** Short searches to run next, under Recent searches in the search card. */
export function KeywordSuggestions({
  projectId,
  query,
  suggestions,
  groupKeywords,
  afterRecentSearches,
}: {
  projectId: string;
  query: UseQueryResult<KeywordSuggestionsData>;
  /** The query's suggestions, minus searches already in Recent searches. */
  suggestions: Suggestion[];
  groupKeywords: boolean;
  afterRecentSearches: boolean;
}) {
  return (
    <section
      aria-label="Buscas sugeridas"
      className={afterRecentSearches ? "space-y-2 pt-6" : "space-y-2 pt-2"}
    >
      <h2 className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lightbulb className="size-4" aria-hidden />
        Buscas sugeridas
      </h2>
      {query.isError ? (
        <QueryError
          error={query.error}
          fallback="Não foi possível carregar as sugestões."
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
          variant="inline"
        />
      ) : (
        <>
          {suggestions.length > 0 ? (
            // The same grid as Recent searches; each whole tile runs the search.
            <ul className="grid gap-2 md:grid-cols-2">
              {suggestions.map((suggestion) => (
                <li key={suggestion.keyword}>
                  <Link
                    from="/p/$projectId/keywords"
                    to="/p/$projectId/keywords"
                    params={{ projectId }}
                    search={{
                      q: suggestion.keyword,
                      grp: groupKeywords ? true : undefined,
                    }}
                    replace
                    className="group flex min-w-0 items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors outline-none hover:bg-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <Search
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 font-medium break-words">
                      {suggestion.keyword}
                    </span>
                    {REASON_NOTES[suggestion.reason] ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {REASON_NOTES[suggestion.reason]}
                      </span>
                    ) : null}
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {query.data?.canGenerate ? (
            <GenerateSuggestions projectId={projectId} />
          ) : null}
        </>
      )}
    </section>
  );
}

function GenerateSuggestions({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const generate = useMutation({
    mutationFn: () => generateKeywordSuggestions({ data: { projectId } }),
    // The error shows inline above the button.
    meta: { errorToast: false },
    // Stay pending until the new topics load.
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: keywordSuggestionsQueryOptions(projectId).queryKey,
      }),
  });

  return (
    <EmptyState
      variant="plain"
      size="sm"
      icon={Sparkles}
      title="Receba sugestões a partir do seu site"
      description={
        isHostedClientAuthMode()
          ? "Lemos seu site e sugerimos temas para pesquisar. Usa poucos créditos."
          : "Lemos seu site e sugerimos temas para pesquisar."
      }
      action={
        // *:justify-center centers the error's button under its message.
        <div className="flex flex-col items-center gap-3 *:justify-center">
          {generate.isError ? (
            // The client only gets an error code, and an unreadable site
            // arrives as a bare validation error, so the copy names it.
            <QueryError
              cause={generate.error}
              fallback="Não foi possível gerar sugestões. Confira se o site abre e tente de novo."
              variant="inline"
            />
          ) : null}
          {/* Trying again can't fix running out, so the credits button
              takes its place. */}
          {getErrorCode(generate.error) === "INSUFFICIENT_CREDITS" ? null : (
            <Button
              variant="outline"
              pending={generate.isPending}
              onClick={() => generate.mutate()}
            >
              Gerar sugestões
            </Button>
          )}
        </div>
      }
    />
  );
}
