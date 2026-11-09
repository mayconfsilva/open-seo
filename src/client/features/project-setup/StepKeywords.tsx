import { useState, type ChangeEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { groupBy } from "remeda";
import { X } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Textarea } from "@/client/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui/tabs";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { getKeywordSuggestions } from "@/serverFunctions/keywords";
import { addSetupKeywords } from "@/serverFunctions/project-setup";
import { removeTrackingKeywords } from "@/serverFunctions/rank-tracking";
import { MAX_KEYWORDS_PER_CONFIG } from "@/shared/rank-tracking";
import { parseKeywordImport } from "./keywordImport";
import {
  SetupCard,
  StepFooter,
  StepHeading,
  useInvalidateSetup,
  type SetupData,
} from "./setupShared";
import { keywordSuggestionsQueryKey } from "./StepSources";

type AddBatch = {
  keywords: string[];
  group: string | null;
  targetUrl: string | null;
};

const NO_GROUP = "Sem grupo";

function splitKeywords(text: string) {
  return text
    .split(/[\n,]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

/** Step 4 (board 5d): type, import or pick suggestions; at least one keyword. */
export function StepKeywords({
  setup,
  onBack,
  onNext,
}: {
  setup: SetupData;
  onBack: () => void;
  onNext: () => void;
}) {
  const projectId = setup.project.id;
  const invalidate = useInvalidateSetup(projectId);
  const [text, setText] = useState("");
  const [group, setGroup] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const existing = new Set(
    setup.keywords.map((kw) => kw.keyword.toLowerCase()),
  );
  const groups = [
    ...new Set(setup.keywords.flatMap((kw) => (kw.group ? [kw.group] : []))),
  ];

  const add = useMutation({
    mutationFn: async (batches: AddBatch[]) => {
      let added = 0;
      for (const batch of batches) {
        const result = await addSetupKeywords({
          data: { projectId, ...batch },
        });
        added += result.added;
      }
      return added;
    },
    onSuccess: async () => {
      await invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (keywordId: string) =>
      removeTrackingKeywords({
        data: {
          projectId,
          configId: setup.config!.id,
          keywordIds: [keywordId],
        },
      }),
    onSuccess: invalidate,
  });

  const typed = splitKeywords(text);
  const duplicates = typed.filter((kw) => existing.has(kw.toLowerCase()));
  const addTyped = () => {
    add.mutate(
      [
        {
          keywords: typed,
          group: group.trim() || null,
          targetUrl: targetUrl.trim() || null,
        },
      ],
      {
        onSuccess: (added) => {
          setText("");
          setNotice(
            duplicates.length > 0
              ? `${added} palavra(s) adicionada(s). ${duplicates.length} já estava(m) na lista e não foi duplicada.`
              : `${added} palavra(s) adicionada(s).`,
          );
        },
      },
    );
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const parsed = parseKeywordImport(await file.text());
    const batches = Object.values(
      groupBy(
        parsed.keywords,
        (kw) => `${kw.group ?? ""}|${kw.targetUrl ?? ""}`,
      ),
    ).map((rows) => ({
      keywords: rows.map((row) => row.keyword),
      group: rows[0].group,
      targetUrl: rows[0].targetUrl,
    }));
    if (batches.length === 0) {
      setNotice(`${file.name}: nenhuma palavra encontrada.`);
      return;
    }
    add.mutate(batches, {
      onSuccess: (added) =>
        setNotice(
          `${file.name} importado: ${added} palavra(s) adicionada(s)` +
            (parsed.skippedLines.length > 0
              ? ` · ${parsed.skippedLines.length} linha(s) ignorada(s) sem palavra: ${parsed.skippedLines.join(", ")}.`
              : "."),
        ),
    });
  };

  const byGroup = groupBy(setup.keywords, (kw) => kw.group ?? NO_GROUP);
  const devices = setup.config?.devices === "both" ? 2 : 1;
  const count = setup.keywords.length;

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="Quais buscas você quer acompanhar?"
        description="Inclua os termos que seus clientes digitam no Google. Obrigatório: ao menos 1 palavra. Grupos e página alvo podem ficar para depois."
      />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <SetupCard>
          <Tabs defaultValue="type">
            <TabsList>
              <TabsTrigger value="type">Digitar</TabsTrigger>
              <TabsTrigger value="import">Importar planilha</TabsTrigger>
              <TabsTrigger value="suggestions">Sugestões</TabsTrigger>
            </TabsList>
            <TabsContent value="type" className="flex flex-col gap-3 pt-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="setup-keywords">
                  Palavras-chave · uma por linha ou separadas por vírgula
                </Label>
                <Textarea
                  id="setup-keywords"
                  rows={5}
                  value={text}
                  placeholder={
                    "instalação de ar condicionado\nmanutenção de split"
                  }
                  onChange={(event) => setText(event.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="setup-group">Grupo</Label>
                  <Input
                    id="setup-group"
                    list="setup-group-options"
                    value={group}
                    placeholder="Ex.: Instalação"
                    onChange={(event) => setGroup(event.target.value)}
                  />
                  <datalist id="setup-group-options">
                    {groups.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="setup-target">Página alvo</Label>
                  <Input
                    id="setup-target"
                    value={targetUrl}
                    placeholder="/servicos/instalacao"
                    onChange={(event) => setTargetUrl(event.target.value)}
                  />
                </div>
              </div>
              {duplicates.length > 0 ? (
                <p className="rounded-md bg-[#fcf0d9] px-3 py-2 text-[12.5px] text-[#7a4800]">
                  Já na lista: {duplicates.map((kw) => `«${kw}»`).join(", ")}.
                  Não vamos duplicar.
                </p>
              ) : null}
              <Button
                className="self-start"
                onClick={addTyped}
                pending={add.isPending}
                disabled={typed.length === duplicates.length}
              >
                Adicionar {typed.length - duplicates.length} palavra(s)
              </Button>
            </TabsContent>
            <TabsContent value="import" className="flex flex-col gap-3 pt-3">
              <p className="text-[13px] text-muted-foreground">
                Envie um arquivo CSV (Excel e Planilhas Google exportam). A
                primeira linha pode ter os nomes das colunas: «termo» ou
                «palavra», e opcionalmente «grupo» e «página alvo».
              </p>
              <Input
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                aria-label="Arquivo de palavras-chave"
                onChange={(event) => void onFile(event)}
              />
            </TabsContent>
            <TabsContent value="suggestions" className="pt-3">
              <SuggestionPicker
                projectId={projectId}
                existing={existing}
                pending={add.isPending}
                onAdd={(keywords) =>
                  add.mutate([{ keywords, group: null, targetUrl: null }], {
                    onSuccess: (added) =>
                      setNotice(`${added} sugestão(ões) adicionada(s).`),
                  })
                }
              />
            </TabsContent>
          </Tabs>
          {notice ? (
            <p className="text-[12.5px] text-muted-foreground">{notice}</p>
          ) : null}
          {add.isError ? (
            <p className="text-sm text-destructive">
              {getStandardErrorMessage(add.error)}
            </p>
          ) : null}
        </SetupCard>

        <SetupCard
          title={`Na lista: ${count} palavra(s) em ${Object.keys(byGroup).length} grupo(s)`}
        >
          <p className="-mt-2 text-[12px] text-muted-foreground">
            Limite por projeto: {MAX_KEYWORDS_PER_CONFIG} palavras
          </p>
          {count === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Nenhuma palavra ainda.
            </p>
          ) : (
            <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
              {Object.entries(byGroup).map(([name, keywords]) => (
                <div key={name} className="flex flex-col gap-1">
                  <span className="text-[11.5px] font-semibold tracking-[.04em] text-muted-foreground uppercase">
                    {name} · {keywords.length}
                  </span>
                  {keywords.map((kw) => (
                    <span
                      key={kw.id}
                      className="flex items-center gap-2 text-[13px]"
                    >
                      <span className="flex-1 truncate">{kw.keyword}</span>
                      {kw.targetUrl ? (
                        <span className="truncate font-mono text-[11.5px] text-muted-foreground">
                          {kw.targetUrl}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Remover ${kw.keyword}`}
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => remove.mutate(kw.id)}
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
          <p className="rounded-md bg-muted/50 px-3 py-2 text-[12px] text-muted-foreground">
            Simulação: {count} palavra(s) × {devices} dispositivo(s) × 4 coletas
            no mês = {count * devices * 4} consultas. O custo aparece na
            revisão.
          </p>
        </SetupCard>
      </div>
      <StepFooter
        onBack={onBack}
        onNext={onNext}
        disabled={count === 0}
        hint={
          count === 0
            ? "Adicione ao menos uma palavra"
            : "Próxima: Concorrentes (opcional)"
        }
      />
    </div>
  );
}

function SuggestionPicker({
  projectId,
  existing,
  pending,
  onAdd,
}: {
  projectId: string;
  existing: Set<string>;
  pending: boolean;
  onAdd: (keywords: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const suggestions = useQuery({
    queryKey: keywordSuggestionsQueryKey(projectId),
    queryFn: () => getKeywordSuggestions({ data: { projectId } }),
  });
  const available = (suggestions.data?.suggestions ?? []).filter(
    (suggestion) => !existing.has(suggestion.keyword.toLowerCase()),
  );
  if (suggestions.isPending) {
    return <p className="text-[13px] text-muted-foreground">Carregando…</p>;
  }
  if (available.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Sem sugestões novas. Leia o site na etapa anterior ou conecte o Search
        Console para receber sugestões.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {available.map((suggestion) => (
        <label
          key={suggestion.keyword}
          className="flex items-center gap-2 text-[13px]"
        >
          <input
            type="checkbox"
            checked={picked.includes(suggestion.keyword)}
            onChange={(event) =>
              setPicked(
                event.target.checked
                  ? [...picked, suggestion.keyword]
                  : picked.filter((kw) => kw !== suggestion.keyword),
              )
            }
          />
          {suggestion.keyword}
        </label>
      ))}
      <Button
        className="self-start"
        disabled={picked.length === 0}
        pending={pending}
        onClick={() => {
          onAdd(picked);
          setPicked([]);
        }}
      >
        Adicionar {picked.length} sugestão(ões)
      </Button>
    </div>
  );
}
