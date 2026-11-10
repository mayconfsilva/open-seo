import { revalidateLogic } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { captureClientEvent } from "@/client/lib/posthog";
import { saveReportTemplate } from "@/serverFunctions/reportTemplates";
import type { ReportTemplate } from "@/types/schemas/report-templates";

// One form for create and edit. Shape only, as at every other boundary: the
// caps come back from the service with their copy and show in a toast.
const formSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao modelo."),
  description: z
    .string()
    .trim()
    .min(1, "Diga em uma linha quando usar este modelo."),
  instructions: z
    .string()
    .trim()
    .min(1, "Diga para quem é o relatório e quais seções ele tem."),
});

const INSTRUCTIONS_PLACEHOLDER = `Público: o responsável de marketing do cliente, sem perfil técnico. Seções, nesta ordem: Onde estamos / O que fizemos no mês / O que mudou / O que esperar. Tom: simples e seguro. Explique todo termo de SEO. Sem pontos de exclamação. Assinatura: Agência Exemplo Cor de destaque: #1C4ED8`;

export function ReportTemplateForm({
  projectId,
  template,
  onClose,
  onSaved,
}: {
  projectId: string;
  /** The template being edited, or undefined when creating one. */
  template?: ReportTemplate;
  onClose: () => void;
  onSaved: () => void;
}) {
  const saveMutation = useMutation({
    // A refusal (duplicate name, the cap) comes back as `{ ok: false }` rather
    // than an error, because thrown errors reach the client stripped to their
    // code. Rethrowing it here lets the mutation cache toast its message.
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const result = await saveReportTemplate({
        data: { projectId, templateId: template?.id, ...values },
      });
      if (!result.ok) throw new Error(result.message);
      return result;
    },
    onSuccess: (result) => {
      captureClientEvent("report_template:saved", {
        project_id: projectId,
        is_update: !result.created,
        source: "app",
      });
      toast.success(result.created ? "Modelo criado" : "Modelo salvo");
      onSaved();
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: template?.name ?? "",
      description: template?.description ?? "",
      instructions: template?.instructions ?? "",
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: ({ value }) => saveMutation.mutateAsync(value),
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saveMutation.isPending) onClose();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-2xl">
        <form.AppForm>
          <form.Form className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>
                {template ? "Editar modelo" : "Novo modelo"}
              </DialogTitle>
            </DialogHeader>

            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label="Nome"
                  placeholder="Acompanhamento mensal do cliente"
                  required
                />
              )}
            </form.AppField>

            <form.AppField name="description">
              {(field) => (
                <field.TextField
                  label="Descrição"
                  description="Uma linha dizendo quando usar. É o que o agente lê para decidir."
                  placeholder="A atualização mensal que enviamos aos clientes de contrato fixo."
                  required
                />
              )}
            </form.AppField>

            <form.AppField name="instructions">
              {(field) => (
                <field.TextareaField
                  label="Instruções"
                  description="O tom de voz do projeto fica em Contexto › Preferências de escrita."
                  className="h-56 font-mono leading-relaxed md:text-xs"
                  placeholder={INSTRUCTIONS_PLACEHOLDER}
                  required
                />
              )}
            </form.AppField>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={saveMutation.isPending}
              >
                Cancelar
              </Button>
              <form.SubmitButton>
                {template ? "Salvar alterações" : "Criar modelo"}
              </form.SubmitButton>
            </DialogFooter>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
