import { useState } from "react";
import { revalidateLogic } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { CardShell } from "@/client/components/CardShell";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import { formatQueries } from "@/client/features/plan-usage/planUsage";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { savePlatformPlan } from "@/serverFunctions/platform";
import { type Overview, useRefreshOverview } from "./platformShared";

const planSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  monthlyQueries: z
    .string()
    .regex(/^\d+$/, "Use só números.")
    .refine((value) => Number(value) >= 1, "Use pelo menos 1."),
});

function PlanForm({
  plan,
  onDone,
}: {
  plan?: Overview["plans"][number];
  onDone: () => void;
}) {
  const refresh = useRefreshOverview();
  const form = useAppForm({
    defaultValues: {
      name: plan?.name ?? "",
      monthlyQueries: plan ? String(plan.monthlyQueries) : "",
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: planSchema },
    onSubmit: async ({ value }) => {
      try {
        await savePlatformPlan({
          data: {
            id: plan?.id,
            name: value.name.trim(),
            monthlyQueries: Number(value.monthlyQueries),
          },
        });
        toast.success("Plano salvo");
        void refresh();
        onDone();
      } catch (error) {
        toast.error(getStandardErrorMessage(error));
      }
    },
  });
  return (
    <form.AppForm>
      <form.Form className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <form.AppField name="name">
          {(field) => <field.TextField label="Nome do plano" />}
        </form.AppField>
        <form.AppField name="monthlyQueries">
          {(field) => (
            <field.TextField label="Consultas por mês" inputMode="numeric" />
          )}
        </form.AppField>
        <div className="flex gap-2">
          <form.SubmitButton>
            {plan ? "Salvar" : "Criar plano"}
          </form.SubmitButton>
          {plan ? (
            <Button variant="ghost" onClick={onDone}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </form.Form>
    </form.AppForm>
  );
}

export function Plans({ overview }: { overview: Overview }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  return (
    <CardShell title="Planos">
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">
          Uma consulta é uma palavra em um dispositivo numa coleta de posição.
          Organizações sem plano escolhido ficam no {overview.defaultPlan.name},
          com {formatQueries(overview.defaultPlan.monthlyQueries)} consultas por
          mês. Ao chegar à franquia, as coletas param até a renovação.
        </p>
        {overview.plans.length > 0 ? (
          <ul className="divide-y divide-hairline rounded-lg border border-border">
            {overview.plans.map((plan) => (
              <li key={plan.id} className="px-4 py-3">
                {editing === plan.id ? (
                  <PlanForm plan={plan} onDone={() => setEditing(null)} />
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span>
                      <span className="font-medium">{plan.name}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatQueries(plan.monthlyQueries)} consultas por mês
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(plan.id)}
                    >
                      Editar
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        <PlanForm key={formKey} onDone={() => setFormKey((key) => key + 1)} />
      </div>
    </CardShell>
  );
}
