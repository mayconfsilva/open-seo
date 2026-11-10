import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { revalidateLogic } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { CardShell } from "@/client/components/CardShell";
import { CopyButton } from "@/client/components/CopyButton";
import { QueryState } from "@/client/components/QueryState";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { organizationContextQueryOptions } from "@/client/features/team/organizationQueries";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  createPartnerInvitation,
  getPlatformOverview,
  revokePartnerInvitation,
  setOrganizationPlan,
  setOrganizationSuspended,
} from "@/serverFunctions/platform";

import {
  type Overview,
  OVERVIEW_KEY,
  PlanSelect,
  formatDate,
  useRefreshOverview,
} from "./platformShared";
import { Plans } from "./PlatformPlans";

/** dataSEO: the platform owner's partners, invitation links and plans. */
export function PlatformPage() {
  const overview = useQuery({
    queryKey: OVERVIEW_KEY,
    queryFn: () => getPlatformOverview(),
  });
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[24px] font-semibold tracking-[-.01em]">
            Plataforma
          </h1>
          <p className="text-[13.5px] text-muted-foreground">
            Agências parceiras, convites e planos. Só você vê esta tela.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to="/consumo" />}
        >
          Consumo e saldo da DataForSEO
        </Button>
      </div>
      <QueryState
        query={overview}
        errorFallback="Não foi possível carregar a plataforma"
      >
        {(data) => (
          <>
            <Partners overview={data} />
            <Invitations overview={data} />
            <Plans overview={data} />
          </>
        )}
      </QueryState>
    </div>
  );
}

function Partners({ overview }: { overview: Overview }) {
  const refresh = useRefreshOverview();
  const org = useQuery(organizationContextQueryOptions());
  const planMutation = useMutation({
    mutationFn: (input: { organizationId: string; planId: string | null }) =>
      setOrganizationPlan({ data: input }),
    onSuccess: () => {
      toast.success("Plano atualizado");
      void refresh();
    },
    onError: (error) => toast.error(getStandardErrorMessage(error)),
  });
  const suspendMutation = useMutation({
    mutationFn: (input: { organizationId: string; suspended: boolean }) =>
      setOrganizationSuspended({ data: input }),
    onSuccess: (_, input) => {
      toast.success(
        input.suspended ? "Organização suspensa" : "Organização reativada",
      );
      void refresh();
    },
    onError: (error) => toast.error(getStandardErrorMessage(error)),
  });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-semibold">Organizações</h2>
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organização</TableHead>
              <TableHead>Dono</TableHead>
              <TableHead>Projetos</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {overview.organizations.map((row) => {
              const own = row.id === org.data?.organizationId;
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="font-medium">{row.name}</span>
                    {own ? (
                      <span className="text-muted-foreground"> (sua)</span>
                    ) : null}
                    <span className="block text-xs text-muted-foreground">
                      Desde {formatDate(row.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.ownerName ?? "—"}
                    <span className="block text-xs text-muted-foreground">
                      {row.ownerEmail ?? ""}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums">{row.projects}</TableCell>
                  <TableCell>
                    {row.unlimited ? (
                      <span className="text-sm">Ilimitado (plataforma)</span>
                    ) : (
                      <PlanSelect
                        overview={overview}
                        value={row.planId}
                        label={`Plano de ${row.name}`}
                        disabled={planMutation.isPending}
                        onChange={(planId) =>
                          planMutation.mutate({
                            organizationId: row.id,
                            planId,
                          })
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {row.suspendedAt ? (
                      <Badge variant="destructive">Suspensa</Badge>
                    ) : (
                      <Badge variant="success">Ativa</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {own ? null : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={suspendMutation.isPending}
                        onClick={() =>
                          suspendMutation.mutate({
                            organizationId: row.id,
                            suspended: !row.suspendedAt,
                          })
                        }
                      >
                        {row.suspendedAt ? "Reativar" : "Suspender"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableCard>
    </section>
  );
}

const invitationSchema = z.object({
  agencyName: z.string().trim().min(1, "Informe o nome da agência."),
  email: z.string().trim().email("Informe um e-mail válido."),
});

function invitationStatus(row: Overview["invitations"][number]) {
  if (row.acceptedAt) return { label: "Aceito", variant: "success" as const };
  if (row.revokedAt) return { label: "Cancelado", variant: "outline" as const };
  if (row.expiresAt < new Date().toISOString())
    return { label: "Vencido", variant: "outline" as const };
  return { label: "Pendente", variant: "soft" as const };
}

function Invitations({ overview }: { overview: Overview }) {
  const refresh = useRefreshOverview();
  const [planId, setPlanId] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) =>
      revokePartnerInvitation({ data: { invitationId } }),
    onSuccess: () => {
      toast.success("Convite cancelado");
      void refresh();
    },
    onError: (error) => toast.error(getStandardErrorMessage(error)),
  });
  const form = useAppForm({
    defaultValues: { agencyName: "", email: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: invitationSchema },
    onSubmit: async ({ value, formApi }) => {
      try {
        const { token } = await createPartnerInvitation({
          data: { ...value, planId },
        });
        setLink(
          `${window.location.origin}/convite-parceiro/${encodeURIComponent(token)}`,
        );
        formApi.reset();
        void refresh();
      } catch (error) {
        toast.error(getStandardErrorMessage(error));
      }
    },
  });

  return (
    <CardShell title="Convidar agência parceira">
      <div className="flex flex-col gap-5">
        <form.AppForm>
          <form.Form className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <form.AppField name="agencyName">
              {(field) => <field.TextField label="Nome da agência" />}
            </form.AppField>
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  label="E-mail do responsável"
                  type="email"
                  autoComplete="off"
                />
              )}
            </form.AppField>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Plano</span>
              <PlanSelect
                overview={overview}
                value={planId}
                onChange={setPlanId}
                label="Plano do parceiro"
              />
            </div>
            <div className="md:col-span-3">
              <form.SubmitButton>Gerar link de convite</form.SubmitButton>
            </div>
          </form.Form>
        </form.AppForm>

        {link ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-subtle p-3">
            <span className="text-sm font-medium">
              Link gerado. Copie agora: ele não aparece de novo.
            </span>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate font-mono text-xs">
                {link}
              </code>
              <CopyButton
                value={link}
                label="Copiar link"
                successMessage="Link copiado"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              Vale por 7 dias e para um único acesso. Envie para o parceiro por
              um canal seu (e-mail, WhatsApp).
            </span>
          </div>
        ) : null}

        {overview.invitations.length > 0 ? (
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agência</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.invitations.map((row) => {
                  const status = invitationStatus(row);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.agencyName}
                      </TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{formatDate(row.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {status.label === "Pendente" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={revokeMutation.isPending}
                            onClick={() => revokeMutation.mutate(row.id)}
                          >
                            Cancelar
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableCard>
        ) : null}
      </div>
    </CardShell>
  );
}
