import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { revalidateLogic } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { getErrorCode } from "@/client/lib/error-messages";
import { captureClientEvent } from "@/client/lib/posthog";
import { isHostedClientAuthMode, usesBetterAuthClient } from "@/lib/auth-mode";
import { sendTeamInvitation } from "@/serverFunctions/organization";

const inviteSchema = z.object({
  email: z.string().trim().email("Digite um e-mail válido."),
});

export function inviteErrorMessage(error: Error) {
  const code = getErrorCode(error);
  if (code === "RATE_LIMITED") {
    return "Limite de convites de hoje atingido. Tente amanhã.";
  }
  if (code === "UPSTREAM_UNAVAILABLE") {
    return "O convite foi salvo, mas o e-mail não saiu. Use Reenviar daqui a pouco.";
  }
  return "Não foi possível enviar o convite.";
}

// Without an email transport (the standalone Docker edition) the server hands
// back the invitation link for the inviter to pass on; with one, it was sent.
export function announceInvitation(
  result: { invitationId: string; inviteUrl?: string },
  sentMessage: string,
) {
  if (!result.inviteUrl) {
    toast.success(sentMessage);
    return;
  }
  const inviteUrl = result.inviteUrl;
  void (
    navigator.clipboard?.writeText(inviteUrl) ?? Promise.reject(new Error())
  ).then(
    () => toast.success("Link do convite copiado"),
    () =>
      toast.success("Link do convite", {
        description: inviteUrl,
        duration: 20000,
      }),
  );
}

export function InviteTeammateModal({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: () => void;
}) {
  // Server function (not authClient.inviteMember): it enforces the daily send
  // limits and fails visibly when the invite email doesn't send.
  // dataSEO: agency staff (admin) or a read-only client of chosen projects.
  const [role, setRole] = useState<"admin" | "client">("admin");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const projectsQuery = useQuery(projectsQueryOptions());
  const projects = (projectsQuery.data ?? []).filter(
    (project) => project.domain !== null && !project.draftSince,
  );
  const inviteMutation = useMutation({
    mutationFn: (inviteeEmail: string) =>
      sendTeamInvitation({
        data: {
          email: inviteeEmail,
          role,
          projectIds: role === "client" ? projectIds : [],
        },
      }),
    onSuccess: (result) => {
      captureClientEvent("team:invitation_send");
      announceInvitation(result, "Convite enviado");
      onInvited();
      onClose();
    },
    onError: (error: Error) => {
      if (getErrorCode(error) === "CONFLICT") {
        form.setErrorMap({
          onSubmit: {
            fields: { email: "Essa pessoa já faz parte da organização." },
          },
        });
      } else {
        toast.error(inviteErrorMessage(error));
      }
      // An email-send failure still creates the pending row — show it.
      onInvited();
    },
  });

  const sharesLink = usesBetterAuthClient() && !isHostedClientAuthMode();

  const form = useAppForm({
    defaultValues: { email: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: inviteSchema },
    onSubmit: ({ value }) => inviteMutation.mutateAsync(value.email.trim()),
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !inviteMutation.isPending) onClose();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <form.AppForm>
          <form.Form className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Convidar pessoa</DialogTitle>
              <DialogDescription>
                {role === "client"
                  ? "O cliente só vê os projetos marcados, em modo leitura, pelo portal do cliente."
                  : "Entra como administrador, com acesso a todos os projetos (exceto cobrança)."}{" "}
                {sharesLink
                  ? "Você recebe um link para enviar à pessoa; ela cria a conta por ele. Vale por 7 dias."
                  : "O link do convite vale por 7 dias."}
              </DialogDescription>
            </DialogHeader>
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  label="E-mail"
                  type="email"
                  placeholder="pessoa@empresa.com.br"
                  required
                  autoFocus
                />
              )}
            </form.AppField>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["admin", "Equipe da agência", "Vê e edita tudo"],
                  ["client", "Cliente", "Só leitura, projetos escolhidos"],
                ] as const
              ).map(([value, label, help]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={role === value}
                  onClick={() => setRole(value)}
                  className={cn(
                    "flex flex-col rounded-md border px-3 py-2 text-left",
                    role === value
                      ? "border-primary bg-accent"
                      : "border-border",
                  )}
                >
                  <span className="text-[13px] font-medium">{label}</span>
                  <span className="text-[12px] text-muted-foreground">
                    {help}
                  </span>
                </button>
              ))}
            </div>
            {role === "client" ? (
              <ProjectChecklist
                projects={projects}
                selected={projectIds}
                onChange={setProjectIds}
              />
            ) : null}
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={inviteMutation.isPending}
              >
                Cancelar
              </Button>
              <form.SubmitButton
                disabled={role === "client" && projectIds.length === 0}
              >
                Enviar convite
              </form.SubmitButton>
            </DialogFooter>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}

/** Checkboxes for the projects a client may read. */
export function ProjectChecklist({
  projects,
  selected,
  onChange,
}: {
  projects: Array<{ id: string; name: string; domain: string | null }>;
  selected: string[];
  onChange: (projectIds: string[]) => void;
}) {
  if (projects.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Nenhum projeto ativo para liberar ainda.
      </p>
    );
  }
  return (
    <fieldset className="flex max-h-56 flex-col gap-1.5 overflow-y-auto rounded-md border border-border p-3">
      <legend className="px-1 text-[12.5px] font-medium">
        Projetos que o cliente pode ver
      </legend>
      {projects.map((project) => (
        <label key={project.id} className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={selected.includes(project.id)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...selected, project.id]
                  : selected.filter((id) => id !== project.id),
              )
            }
          />
          <span className="truncate">{project.name}</span>
          <span className="truncate font-mono text-[11.5px] text-muted-foreground">
            {project.domain}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
