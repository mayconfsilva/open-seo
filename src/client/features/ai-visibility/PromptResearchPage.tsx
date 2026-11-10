import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Telescope } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { BackLink, PageHeader } from "@/client/components/PageHeader";
import { SearchCard, SearchInput } from "@/client/components/SearchCard";
import {
  SkeletonPageContent,
  SkeletonTableRows,
} from "@/client/components/SkeletonPresets";
import { Button } from "@/client/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { PromptResearchKeyword } from "./PromptResearchKeyword";
import {
  AiQueryError,
  aiResearchKeywordsQueryOptions,
  useAiVisibilityTracker,
} from "./shared";

export function PromptResearchPage({
  projectId,
  keyword,
}: {
  projectId: string;
  keyword: string | undefined;
}) {
  const trackerQuery = useAiVisibilityTracker(projectId);
  const state = trackerQuery.data;
  if (trackerQuery.isPending) return <SkeletonPageContent />;
  if (trackerQuery.isError)
    return (
      <AiQueryError
        error={trackerQuery.error}
        retry={() => {
          void trackerQuery.refetch();
        }}
      />
    );
  return (
    <div className="space-y-4">
      <PageHeader
        title="Pesquisa de prompts"
        description="Encontre as perguntas que as pessoas fazem à IA sobre seu mercado e os sites citados nas respostas."
        backLink={
          keyword && state?.configured ? (
            <BackLink
              to="/p/$projectId/ai-visibility/research"
              params={{ projectId }}
            >
              Palavras relevantes
            </BackLink>
          ) : undefined
        }
      />
      {!state?.configured ? (
        <EmptyState
          icon={Telescope}
          title="A pesquisa de prompts começa com um acompanhamento"
          description="Configure o acompanhamento de prompts para pesquisar prompts dos seus temas."
          action={
            <Button
              size="sm"
              nativeButton={false}
              render={
                <Link to="/p/$projectId/ai-visibility" params={{ projectId }} />
              }
            >
              Configurar acompanhamento de prompts
            </Button>
          }
        />
      ) : (
        <>
          {/* A new keyword resets the draft. The prefix keeps this key apart
              from its keyword-view sibling's. */}
          <KeywordSearch
            key={`search:${keyword ?? ""}`}
            projectId={projectId}
            keyword={keyword}
          />
          {keyword ? (
            <PromptResearchKeyword
              key={keyword}
              projectId={projectId}
              state={state}
              keyword={keyword}
            />
          ) : (
            <KeywordList projectId={projectId} />
          )}
        </>
      )}
    </div>
  );
}

function KeywordList({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const query = useQuery(aiResearchKeywordsQueryOptions(projectId));
  return (
    <div className="overflow-hidden rounded-lg border bg-card border-border">
      <div className="border-b p-4 border-border">
        <h2 className="font-medium">Palavras relevantes</h2>
        <p className="text-sm text-muted-foreground">
          Escolha uma palavra para ver os prompts que as pessoas fazem à IA
          sobre ela.
        </p>
      </div>
      {query.isPending ? (
        <SkeletonTableRows rows={5} columns={1} className="p-4" />
      ) : query.isError ? (
        <AiQueryError
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : !query.data.keywords.length ? (
        <p className="p-10 text-center text-sm text-muted-foreground">
          Adicione temas ao acompanhamento ou busque uma palavra acima.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Palavra</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Abrir</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.keywords.map((keyword) => (
              // Any cell opens the keyword; the link keeps it keyboard reachable.
              <TableRow
                key={keyword}
                className="cursor-pointer"
                onClick={() =>
                  void navigate({
                    to: "/p/$projectId/ai-visibility/research",
                    params: { projectId },
                    search: { q: keyword },
                  })
                }
              >
                <TableCell>
                  <Link
                    to="/p/$projectId/ai-visibility/research"
                    params={{ projectId }}
                    search={{ q: keyword }}
                    className="font-medium hover:underline"
                    // The row navigates too; this keeps new-tab clicks to one tab.
                    onClick={(event) => event.stopPropagation()}
                  >
                    {keyword}
                  </Link>
                </TableCell>
                <TableCell>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function KeywordSearch({
  projectId,
  keyword,
}: {
  projectId: string;
  keyword: string | undefined;
}) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(keyword ?? "");
  const [error, setError] = useState<string | null>(null);
  return (
    <SearchCard
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.trim()) {
          setError("Digite uma palavra.");
          return;
        }
        void navigate({
          to: "/p/$projectId/ai-visibility/research",
          params: { projectId },
          search: { q: draft.trim() },
        });
      }}
      error={error}
      errorId="ai-keyword-research-error"
      secondRow={
        <p
          id="ai-keyword-research-cost"
          className="text-xs text-muted-foreground"
        >
          Cerca de US$ 0,25 em créditos por palavra.
        </p>
      }
    >
      <SearchInput
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(null);
        }}
        placeholder="Digite uma palavra"
        aria-label="Palavra"
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error
            ? "ai-keyword-research-error ai-keyword-research-cost"
            : "ai-keyword-research-cost"
        }
        maxLength={100}
      />
    </SearchCard>
  );
}
