import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { revalidateLogic } from "@tanstack/react-form";
import { useAppForm } from "@/client/components/form/useAppForm";
import { useAuditCapabilities } from "@/client/features/audit/shared";
import { isEveryAppClientAuthMode } from "@/lib/auth-mode";
import { saveCrawlerCredential } from "@/serverFunctions/crawlerAccess";
import {
  isCrawlerAccessExpired,
  parseSignatureExpiry,
} from "@/shared/crawler-access";

export const crawlerCredentialsQueryKey = ["crawler-credentials"];
export const saveCrawlerCredentialMutationKey = ["save-crawler-credential"];

/**
 * CRAWLER_ACCESS_SECRET is optional on Every App and on self-hosts, so the form
 * and the Shopify crawl warning say how to set it instead of failing on save.
 */
export function CrawlerAccessSetupHint() {
  if (isEveryAppClientAuthMode()) {
    return (
      <>
        An admin sets <code>CRAWLER_ACCESS_SECRET</code> with{" "}
        <code>
          pnpm everyapp secret set CRAWLER_ACCESS_SECRET --app openseo
        </code>
        .
      </>
    );
  }
  return (
    <>
      An admin sets <code>CRAWLER_ACCESS_SECRET</code> to at least 32 random
      characters in the deployment's environment, then redeploys.
    </>
  );
}

/** Whether to show the setup hint, once the server has said. */
export function useCrawlerAccessNeedsSetup(projectId: string) {
  return useAuditCapabilities(projectId).data?.canStoreCrawlerAccess === false;
}

const signatureSchema = z.object({
  host: z.string().trim().min(1, "Informe um domínio."),
  signatureInput: z
    .string()
    .trim()
    .min(1, "Informe o Signature-Input.")
    .refine(
      (value) => !isCrawlerAccessExpired(parseSignatureExpiry(value)),
      "Esta assinatura já expirou. Crie outra no admin da Shopify.",
    ),
  signature: z.string().trim().min(1, "Informe a assinatura."),
});

/**
 * The two values a merchant copies out of Shopify admin. `Signature-Agent` is
 * a constant we add ourselves, so it is not asked for here.
 */
export function CrawlerAccessForm({
  projectId,
  initialHost,
  lockHost = false,
  onSaved,
}: {
  /** The project (website) the signature is stored on. */
  projectId: string;
  initialHost: string;
  lockHost?: boolean;
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationKey: saveCrawlerCredentialMutationKey,
    mutationFn: (values: z.infer<typeof signatureSchema>) =>
      saveCrawlerCredential({
        data: { projectId, ...values },
      }),
    onSuccess: async (result) => {
      if ("problem" in result) return;
      await queryClient.invalidateQueries({
        queryKey: crawlerCredentialsQueryKey,
      });
      toast.success(
        `Acesso do rastreador salvo para ${result.credential.host}`,
      );
      onSaved?.();
    },
  });

  const form = useAppForm({
    defaultValues: { host: initialHost, signatureInput: "", signature: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: signatureSchema },
    onSubmit: async ({ value, formApi }) => {
      const result = await saveMutation.mutateAsync(value);
      if ("problem" in result) {
        const { problem } = result;
        formApi.setErrorMap({
          onSubmit: {
            fields: {
              signatureInput:
                problem.reason === "wrong_domain"
                  ? `Esta assinatura foi criada para ${problem.signedHost}, não para ${problem.host}. No admin da Shopify, crie uma assinatura para ${problem.host}.`
                  : `A Shopify não aceita esta assinatura para ${problem.host}. Confira se ela foi criada para ${problem.host} e se você copiou os dois valores inteiros.`,
            },
          },
        });
        return;
      }
      formApi.reset({ ...value, signatureInput: "", signature: "" });
    },
  });

  if (useCrawlerAccessNeedsSetup(projectId)) {
    return (
      <p className="text-sm text-muted-foreground">
        O acesso do rastreador ainda não está configurado.{" "}
        <CrawlerAccessSetupHint />
      </p>
    );
  }

  return (
    <form.AppForm>
      <form.Form className="space-y-3">
        {!lockHost ? (
          <form.AppField name="host">
            {(field) => (
              <field.TextField
                label="Domínio"
                placeholder="store.example.com"
                className="font-mono"
                required
              />
            )}
          </form.AppField>
        ) : null}
        <form.AppField name="signatureInput">
          {(field) => (
            <field.TextField
              label="Signature-Input"
              type="password"
              autoComplete="off"
              data-ph-mask
              className="font-mono"
              placeholder="sig1=(...);expires=..."
              required
            />
          )}
        </form.AppField>
        <form.AppField name="signature">
          {(field) => (
            <field.TextField
              label="Assinatura"
              description="A Shopify também mostra um valor Signature-Agent. Não precisa colar: o dataSEO envia em toda requisição."
              type="password"
              autoComplete="off"
              data-ph-mask
              className="font-mono"
              placeholder="sig1=:...:"
              required
            />
          )}
        </form.AppField>
        <form.SubmitButton disabled={!projectId}>
          Salvar assinatura
        </form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}
