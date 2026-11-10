import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ChevronRight, CircleCheck, CircleX, Download } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { revalidateLogic } from "@tanstack/react-form";
import { useAppForm } from "@/client/components/form/useAppForm";
import { CardShell } from "@/client/components/CardShell";
import { QueryError } from "@/client/components/QueryState";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import { CopyButton } from "@/client/components/CopyButton";
import { Button } from "@/client/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";
import {
  checkIndexNowKeyFiles,
  getIndexNowSetup,
  setUpIndexNow,
  submitIndexNowUrls,
} from "@/serverFunctions/indexnow";

const urlsSchema = z.object({
  urls: z
    .string()
    .refine(
      (value) => splitUrls(value).length > 0,
      "Informe pelo menos uma URL.",
    ),
});

function splitUrls(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

const AGENT_PROMPT = "Envie ao IndexNow as páginas que acabei de publicar.";

type KeyFileHost = Awaited<
  ReturnType<typeof checkIndexNowKeyFiles>
>["hosts"][number];

const KEY_FILE_LABELS: Record<KeyFileHost["status"], string> = {
  found: "Encontrado",
  missing: "Não encontrado",
  wrong_content: "Deve conter só a chave",
  redirects: "Redireciona. O arquivo precisa abrir neste endereço",
  moved: "Redireciona para outro endereço",
  unreachable: "Não foi possível acessar este endereço",
  unknown: "Não foi possível conferir agora",
};

// A host that forwards to another one or doesn't load has no pages to
// submit, so it doesn't need the file.
const isUnused = (host: KeyFileHost) =>
  host.status === "moved" || host.status === "unreachable";

const pluralUrls = (count: number) => `${count} URL${count === 1 ? "" : "s"}`;

function downloadKeyFile(key: string) {
  const url = URL.createObjectURL(new Blob([key], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${key}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * IndexNow tells Bing and the other participating engines which pages
 * changed. The site proves ownership by hosting the project's key file.
 */
export function IndexNowSettings({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const setupQueryKey = ["indexnow-setup", projectId];
  const setupQuery = useQuery({
    queryKey: setupQueryKey,
    queryFn: () => getIndexNowSetup({ data: { projectId } }),
    // Website edits elsewhere don't invalidate this, so refetch on each visit.
    staleTime: 0,
  });

  const setUpMutation = useMutation({
    mutationFn: () => setUpIndexNow({ data: { projectId } }),
    onSuccess: (setup) => queryClient.setQueryData(setupQueryKey, setup),
  });

  const keyFilesQueryKey = ["indexnow-key-files", projectId];
  const hasKey = Boolean(setupQuery.data?.domain && setupQuery.data.key);
  const keyFilesQuery = useQuery({
    queryKey: keyFilesQueryKey,
    queryFn: () => checkIndexNowKeyFiles({ data: { projectId } }),
    enabled: hasKey,
  });

  const submitMutation = useMutation({
    mutationFn: (urls: string[]) =>
      submitIndexNowUrls({ data: { projectId, urls } }),
  });

  const form = useAppForm({
    defaultValues: { urls: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: urlsSchema },
    onSubmit: async ({ value, formApi }) => {
      const result = await submitMutation.mutateAsync(splitUrls(value.urls));
      const failed = result.hosts.filter((host) => host.status === "failed");
      const sent = result.hosts
        .filter((host) => host.status === "submitted")
        .reduce((count, host) => count + host.urlCount, 0);

      for (const host of failed) {
        toast.error("Não foi possível enviar ao IndexNow", {
          description: host.message,
          duration: 10_000,
        });
      }
      if (sent > 0) toast.success(`${pluralUrls(sent)} enviada(s)`);
      if (result.skipped.length > 0) {
        toast.warning(
          `${pluralUrls(result.skipped.length)} ignorada(s) por não serem de ${setupQuery.data?.domain}`,
        );
      }
      if (failed.length > 0) {
        void queryClient.invalidateQueries({ queryKey: keyFilesQueryKey });
      }
      if (failed.length === 0 && sent > 0) formApi.reset();
    },
  });

  if (setupQuery.isError) {
    return (
      <section id="indexnow" className="scroll-mt-6">
        <CardShell title="IndexNow">
          <QueryError
            error={setupQuery.error}
            fallback="Não foi possível carregar o IndexNow."
            onRetry={() => void setupQuery.refetch()}
            isRetrying={setupQuery.isFetching}
          />
        </CardShell>
      </section>
    );
  }
  if (!setupQuery.data) return null;
  const { domain, key } = setupQuery.data;

  return (
    <section id="indexnow" className="scroll-mt-6">
      <CardShell title="IndexNow">
        <div className="flex flex-1 flex-col gap-4 text-sm">
          <p className="text-muted-foreground">
            Avise o Bing sobre páginas novas e atualizadas assim que publicar,
            sem esperar ele rastrear o site. O Bing também alimenta os
            resultados do DuckDuckGo e do Yahoo. O Google não usa o IndexNow.
          </p>
          {!domain ? (
            <p className="text-muted-foreground">
              Cadastre o site nas configurações gerais para usar o IndexNow.
            </p>
          ) : !key ? (
            <div className="mt-auto flex justify-end">
              <Button
                variant="outline"
                size="sm"
                pending={setUpMutation.isPending}
                onClick={() => setUpMutation.mutate()}
              >
                Configurar o IndexNow
              </Button>
            </div>
          ) : (
            <ol className="space-y-5">
              <KeyFileStep
                domain={domain}
                indexNowKey={key}
                hosts={keyFilesQuery.data?.hosts}
                isChecking={keyFilesQuery.isFetching}
                onCheck={() => void keyFilesQuery.refetch()}
              />
              <Step
                number={2}
                title="Envie as páginas quando publicar ou atualizar"
              >
                <p className="text-muted-foreground">
                  Cole só as páginas que mudaram, não o site inteiro.
                </p>
                <form.AppForm>
                  <form.Form className="space-y-3">
                    <form.AppField name="urls">
                      {(field) => (
                        <field.TextareaField
                          label={
                            <span className="text-xs font-normal text-muted-foreground">
                              URLs (uma por linha)
                            </span>
                          }
                          placeholder={`https://${domain}/new-page`}
                          className="min-h-28 font-mono text-xs"
                        />
                      )}
                    </form.AppField>
                    <form.SubmitButton>Enviar ao IndexNow</form.SubmitButton>
                  </form.Form>
                </form.AppForm>
                <div className="space-y-1 rounded-md bg-muted/50 p-3 text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      Ou peça ao seu agente:{" "}
                      <span className="text-foreground">"{AGENT_PROMPT}"</span>
                    </span>
                    <CopyButton
                      value={AGENT_PROMPT}
                      successMessage="Prompt copiado"
                      size="icon-xs"
                      variant="ghost"
                      label="Copiar prompt"
                    />
                  </div>
                  <p className="text-xs">
                    Se ele puder editar o código do site, também consegue
                    adicionar o arquivo da chave.
                  </p>
                </div>
              </Step>
            </ol>
          )}
        </div>
      </CardShell>
    </section>
  );
}

function KeyFileStep({
  domain,
  indexNowKey,
  hosts,
  isChecking,
  onCheck,
}: {
  domain: string;
  indexNowKey: string;
  hosts: KeyFileHost[] | undefined;
  isChecking: boolean;
  onCheck: () => void;
}) {
  const used = hosts?.filter((host) => !isUnused(host)) ?? [];
  // Until the check answers, list both addresses without a status.
  const shown: { host: string; status?: KeyFileHost["status"] }[] = !hosts
    ? [{ host: domain }, { host: `www.${domain}` }]
    : used.length > 0
      ? used
      : hosts;
  const verified =
    used.length > 0 && used.every((host) => host.status === "found");

  return (
    <Step
      number={1}
      title={
        verified
          ? "O arquivo da chave está configurado"
          : "Adicione este arquivo de chave ao site"
      }
    >
      {verified ? null : (
        <>
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => downloadKeyFile(indexNowKey)}
          >
            <Download className="size-4" />
            Baixar arquivo da chave
          </Button>
          <p className="text-muted-foreground">
            Coloque na raiz do site, para que abra em:
          </p>
        </>
      )}
      <ul className="space-y-1">
        {shown.map((host) => (
          <li
            key={host.host}
            className="flex flex-wrap items-center gap-x-2 gap-y-0.5"
          >
            <SafeExternalLink
              url={`https://${host.host}/${indexNowKey}.txt`}
              label={`https://${host.host}/${indexNowKey}.txt`}
              className="inline-flex items-center gap-1 font-mono text-xs break-all text-foreground underline underline-offset-2"
            />
            {host.status ? <KeyFileStatus status={host.status} /> : null}
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        size="xs"
        className="w-fit"
        pending={isChecking}
        onClick={onCheck}
      >
        Conferir de novo
      </Button>
      {verified ? null : (
        <Collapsible>
          <CollapsibleTrigger className="group inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ChevronRight
              className="size-3.5 transition-transform group-data-[panel-open]:rotate-90"
              aria-hidden
            />
            Como adiciono um arquivo ao site?
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                Site feito em código: coloque o arquivo na pasta que o site
                publica sem alterar, geralmente chamada <code>public</code> ou{" "}
                <code>static</code>.
              </li>
              <li>
                WordPress: envie pelo gerenciador de arquivos da hospedagem ou
                por SFTP para a pasta que tem o <code>wp-config.php</code>.
                Plugins de SEO como o Rank Math também enviam ao IndexNow por
                você.
              </li>
              <li>
                No Cloudflare: ative o Crawler Hints nas configurações de cache
                e ele envia as páginas alteradas ao IndexNow por você.
              </li>
              <li>
                Construtores de sites como Webflow, Shopify, Squarespace e Wix
                geralmente não deixam adicionar arquivos na raiz. Veja se o seu
                já tem suporte ao IndexNow.
              </li>
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </Step>
  );
}

function KeyFileStatus({ status }: { status: KeyFileHost["status"] }) {
  const problem =
    status === "missing" ||
    status === "wrong_content" ||
    status === "redirects";
  const Icon = status === "found" ? CircleCheck : problem ? CircleX : undefined;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${status === "found" ? "text-success" : problem ? "text-destructive" : "text-muted-foreground"}`}
    >
      {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
      {KEY_FILE_LABELS[status]}
    </span>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {number}
      </span>
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <p className="font-medium">{title}</p>
        {children}
      </div>
    </li>
  );
}
