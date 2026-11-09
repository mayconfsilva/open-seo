import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { GoogleConnectionCard } from "@/client/features/integrations/GoogleConnectionCard";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  generateKeywordSuggestions,
  getKeywordSuggestions,
} from "@/serverFunctions/keywords";
import {
  SetupCard,
  StepFooter,
  StepHeading,
  type SetupData,
} from "./setupShared";

export function keywordSuggestionsQueryKey(projectId: string) {
  return ["keywordSuggestions", projectId];
}

/**
 * Step 3 (board 5c): optional Google connections, and a reading of the site
 * that turns its pages into suggested searches for step 4.
 */
export function StepSources({
  setup,
  onBack,
  onNext,
}: {
  setup: SetupData;
  onBack: () => void;
  onNext: () => void;
}) {
  const projectId = setup.project.id;
  const queryClient = useQueryClient();
  const suggestions = useQuery({
    queryKey: keywordSuggestionsQueryKey(projectId),
    queryFn: () => getKeywordSuggestions({ data: { projectId } }),
  });
  const readSite = useMutation({
    mutationFn: () => generateKeywordSuggestions({ data: { projectId } }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: keywordSuggestionsQueryKey(projectId),
      }),
  });
  const found = suggestions.data?.suggestions.length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="Conecte dados do Google e confira as páginas"
        description="As conexões são opcionais e podem ser feitas depois em Configurações › Integrações. Elas só autorizam a leitura dos dados do site."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <GoogleConnectionCard provider="gsc" projectId={projectId} />
        <GoogleConnectionCard provider="ga4" projectId={projectId} />
      </div>
      <SetupCard title="Páginas do site">
        <p className="text-[13px] text-muted-foreground">
          Lemos as páginas de {setup.project.domain} para entender os serviços e
          sugerir buscas na próxima etapa. Usa a IA configurada no servidor e
          leva cerca de um minuto.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => readSite.mutate()}
            pending={readSite.isPending}
            disabled={suggestions.data ? !suggestions.data.canGenerate : true}
          >
            <Sparkles data-icon="inline-start" />
            Ler o site e sugerir buscas
          </Button>
          <span className="text-[12.5px] text-muted-foreground">
            {readSite.isPending
              ? "Lendo páginas…"
              : found > 0
                ? `${found} sugestões prontas para a etapa de palavras-chave`
                : "Nenhuma sugestão ainda"}
          </span>
        </div>
        {readSite.isError ? (
          <p className="text-sm text-destructive">
            Não foi possível ler o site agora:{" "}
            {getStandardErrorMessage(readSite.error)}. Você pode seguir e
            digitar as palavras.
          </p>
        ) : null}
      </SetupCard>
      <StepFooter
        onBack={onBack}
        onNext={onNext}
        nextLabel="Continuar"
        hint="Você pode continuar enquanto a leitura termina."
      />
    </div>
  );
}
