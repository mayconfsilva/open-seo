import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { identity, sortBy } from "remeda";
import { Columns3, MessageSquare, SearchCheck, Sparkles } from "lucide-react";
import { useHostedPlanGate } from "@/client/features/billing/HostedPlanGate";
import { ResearchPageShell } from "@/client/features/ai-search/ResearchPageShell";
import { PromptTrackingWithoutUpgradeButton } from "@/client/features/ai-visibility/shared";
import { PromptExplorerForm } from "@/client/features/ai-search/components/PromptExplorerForm";
import { PromptExplorerLoadingState } from "@/client/features/ai-search/components/PromptExplorerLoadingState";
import { PromptExplorerResults } from "@/client/features/ai-search/components/PromptExplorerResults";
import {
  PROMPT_EXPLORER_STALE_TIME_MS,
  buildPromptExplorerQueryKey,
  promptExplorerQueryFn,
  type PromptExplorerSearch,
} from "@/client/features/ai-search/promptExplorerQuery";
import { SearchTabStrip } from "@/client/features/search-tabs/SearchTabStrip";
import type {
  PromptSearchTabInput,
  SearchTabInput,
} from "@/client/features/search-tabs/types";
import { useSearchTabNavigation } from "@/client/features/search-tabs/useSearchTabNavigation";
import { RecentSearches } from "@/client/components/RecentSearches";
import { BackLink } from "@/client/components/PageHeader";
import { formatModelLabel } from "@/shared/prompt-explorer-labels";
import { usePromptExplorerSearchHistory } from "@/client/hooks/usePromptExplorerSearchHistory";
import {
  BRAND_LOOKUP_MAX_INPUT_LENGTH,
  PROMPT_EXPLORER_MAX_PROMPT_LENGTH,
} from "@/types/schemas/ai-search";

type PromptExplorerFormValues = PromptExplorerSearch;

type Props = {
  projectId: string;
  urlState: PromptExplorerFormValues;
  onSubmit: (values: PromptExplorerFormValues) => void;
  /** Clears the active search, back to recent searches. */
  onClear: () => void;
};

const PROMPT_EXPLORER_BULLETS = [
  {
    icon: Columns3,
    title: "Quatro modelos lado a lado",
    body: "Rode um prompt no ChatGPT, Claude, Gemini e Perplexity e compare as respostas numa só tela.",
  },
  {
    icon: SearchCheck,
    title: "Veja o que os modelos citam",
    body: "Cada resposta lista as fontes usadas, para você conferir de onde cada modelo tira a informação.",
  },
  {
    icon: Sparkles,
    title: "Confira menções à marca",
    body: "Destaque uma marca para ver na hora se ela aparece no texto da resposta ou nas fontes citadas.",
  },
];

// The strip truncates labels to its width; the tooltip shows the full prompt.
function promptTabLabel(input: SearchTabInput) {
  if (input.type !== "prompt") return "";
  return input.models.length > 1
    ? `${input.prompt} · ${input.models.length} modelos`
    : input.prompt;
}

export function PromptExplorerPage({
  projectId,
  urlState,
  onSubmit,
  onClear,
}: Props) {
  const planStatus = useHostedPlanGate();
  const [form, setForm] = useState<PromptExplorerFormValues>(urlState);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    history,
    isLoaded: historyLoaded,
    addSearch,
    removeHistoryItem,
  } = usePromptExplorerSearchHistory(projectId);

  const trimmedPrompt = urlState.prompt.trim();
  const hasActivePrompt = trimmedPrompt.length > 0;

  const urlInput = useMemo<PromptSearchTabInput | null>(() => {
    const prompt = urlState.prompt.trim();
    if (!prompt) return null;
    return {
      type: "prompt",
      ...urlState,
      prompt,
      highlightBrand: urlState.highlightBrand.trim(),
    };
  }, [urlState]);

  const searchTabs = useSearchTabNavigation({
    storageKey: `prompt-explorer:${projectId}`,
    urlInput,
    getLabel: promptTabLabel,
    navigateToInput: useCallback(
      (input: SearchTabInput | null) => {
        if (input?.type !== "prompt") {
          onClear();
          return;
        }
        const { type: _type, ...search } = input;
        onSubmit(search);
      },
      [onClear, onSubmit],
    ),
  });

  const exploreQuery = useQuery({
    queryKey: buildPromptExplorerQueryKey(projectId, urlState),
    queryFn: () => promptExplorerQueryFn(projectId, urlState),
    // Client-side gate is a UX optimization only; the paywall is enforced
    // in the shared service before any DataForSEO spend,
    // so a stale free-plan window here just yields a rejected request, not cost.
    enabled: hasActivePrompt && planStatus === "paid",
    staleTime: PROMPT_EXPLORER_STALE_TIME_MS,
    gcTime: PROMPT_EXPLORER_STALE_TIME_MS,
    retry: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = form.prompt.trim();
    if (trimmed.length === 0) {
      setValidationError("Digite um prompt");
      return;
    }
    if (trimmed.length > PROMPT_EXPLORER_MAX_PROMPT_LENGTH) {
      setValidationError(
        `Use prompts com menos de ${PROMPT_EXPLORER_MAX_PROMPT_LENGTH} caracteres`,
      );
      return;
    }
    if (form.highlightBrand.trim().length > BRAND_LOOKUP_MAX_INPUT_LENGTH) {
      setValidationError(
        `Use uma marca com menos de ${BRAND_LOOKUP_MAX_INPUT_LENGTH} caracteres`,
      );
      return;
    }
    if (form.models.length === 0) {
      setValidationError("Escolha pelo menos um modelo");
      return;
    }
    setValidationError(null);
    onSubmit({
      ...form,
      prompt: trimmed,
      highlightBrand: form.highlightBrand.trim(),
    });
  };

  const updateForm = <K extends keyof PromptExplorerFormValues>(
    key: K,
    value: PromptExplorerFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (validationError) setValidationError(null);
  };

  // The project is part of both keys, so switching projects resets the form
  // and records the search in the new project's history.
  const historyKey = [
    projectId,
    trimmedPrompt,
    urlState.highlightBrand.trim(),
    sortBy(urlState.models, identity()).join(","),
    urlState.webSearch,
    urlState.webSearchCountryCode,
  ].join("|");

  return (
    <ResearchPageShell
      contained
      title="Explorador de prompts"
      description="Faça qualquer pergunta ao ChatGPT, Claude, Gemini e Perplexity lado a lado."
      gate={{
        feature: "Explorador de prompts",
        description:
          "Faça a mesma pergunta ao ChatGPT, Claude, Gemini e Perplexity ao mesmo tempo e compare as respostas, inclusive as fontes que cada modelo cita.",
        features: PROMPT_EXPLORER_BULLETS,
        alternative: (
          <PromptTrackingWithoutUpgradeButton projectId={projectId} />
        ),
      }}
      form={
        <PromptExplorerForm
          form={form}
          onPromptChange={(value) => updateForm("prompt", value)}
          onHighlightBrandChange={(value) =>
            updateForm("highlightBrand", value)
          }
          onModelsChange={(value) => updateForm("models", value)}
          onWebSearchChange={(value) => updateForm("webSearch", value)}
          onCountryChange={(value) => updateForm("webSearchCountryCode", value)}
          onSubmit={handleSubmit}
          validationError={validationError}
        />
      }
      tabs={
        hasActivePrompt ? (
          <SearchTabStrip
            projectId={projectId}
            activeTabId={searchTabs.activeTabId}
            tabs={searchTabs.tabs}
            onSelect={searchTabs.selectTab}
            onClose={searchTabs.closeTab}
            onViewed={searchTabs.markTabViewed}
          />
        ) : null
      }
      loadingState={<PromptExplorerLoadingState models={urlState.models} />}
      query={exploreQuery}
      hasActiveQuery={hasActivePrompt}
      errorFallback="Não foi possível carregar os resultados do prompt"
      // Covers browser back/forward and history links. The route builds a
      // fresh `urlState` object on every render, so compare by value.
      urlKey={`${projectId}:${JSON.stringify(urlState)}`}
      onUrlChange={() => {
        setForm(urlState);
        setValidationError(null);
      }}
      historyKey={historyKey}
      onSuccess={() =>
        addSearch({
          prompt: trimmedPrompt,
          highlightBrand: urlState.highlightBrand.trim(),
          models: urlState.models,
          webSearch: urlState.webSearch,
          webSearchCountryCode: urlState.webSearchCountryCode,
        })
      }
      backLink={
        <BackLink
          from="/p/$projectId/prompt-explorer"
          to="/p/$projectId/prompt-explorer"
          params={{ projectId }}
          search={{}}
          replace
        >
          Buscas recentes
        </BackLink>
      }
      renderResults={(result) => <PromptExplorerResults result={result} />}
      history={
        <RecentSearches
          items={history}
          loaded={historyLoaded}
          onRemove={removeHistoryItem}
          emptyIcon={MessageSquare}
          emptyTitle="Digite um prompt para comparar as respostas dos modelos"
          getTitle={(item) => item.prompt}
          getSubtitle={(item) => item.models.map(formatModelLabel).join(", ")}
          renderLink={(item, props) => (
            <Link
              from="/p/$projectId/prompt-explorer"
              to="/p/$projectId/prompt-explorer"
              params={{ projectId }}
              search={{
                q: item.prompt,
                models: item.models,
                web: item.webSearch ? undefined : false,
                cc: item.webSearchCountryCode,
                hb: item.highlightBrand || undefined,
              }}
              replace
              {...props}
            />
          )}
        />
      }
    />
  );
}
