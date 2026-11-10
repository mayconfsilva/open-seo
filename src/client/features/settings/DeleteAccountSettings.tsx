import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { SectionHeader } from "@/client/components/PageHeader";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/client/components/ui/alert-dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import {
  getErrorCode,
  getStandardErrorMessage,
} from "@/client/lib/error-messages";
import { signOutAndRedirect, useSession } from "@/lib/auth-client";
import {
  getAccountDeletionStatus,
  requestAccountDeletion,
} from "@/serverFunctions/account-deletion";
import { formatDeletionDate } from "@/shared/account-deletion";

type Status = Awaited<ReturnType<typeof getAccountDeletionStatus>>;

function blockerText(blocker: Status["blockers"][number]) {
  const others =
    blocker.otherMemberCount === 1
      ? "1 outro membro"
      : `${blocker.otherMemberCount} outros membros`;
  return `Você é dono de “${blocker.organizationName}”, que tem ${others}. Excluir sua conta deixaria a organização sem dono. Remova esses membros nas configurações da organização ou transfira a posse para um deles antes.`;
}

function billingText(charge: Status["billingToStop"][number]) {
  const stops = [
    charge.renewingPlan ? "cancelar o plano pago" : null,
    charge.autoReload ? "desligar a recarga automática" : null,
  ]
    .filter(Boolean)
    .join(" e ");
  return `“${charge.organizationName}”: vamos ${stops}.`;
}

function deletionErrorMessage(error: unknown) {
  switch (getErrorCode(error)) {
    case "FORBIDDEN":
      return "Por segurança, saia e entre de novo, depois tente outra vez.";
    case "VALIDATION_ERROR":
      return "Sua conta ainda não pode ser excluída. Clique em Excluir conta de novo para ver o motivo.";
    case "CONFLICT":
      return "Sua conta já está agendada para exclusão.";
    default:
      return getStandardErrorMessage(error);
  }
}

export function DeleteAccountSettings() {
  const [open, setOpen] = useState(false);
  const statusQuery = useQuery({
    queryKey: ["accountDeletionStatus"],
    queryFn: () => getAccountDeletionStatus(),
    // The fresh sign-in window runs out while the page sits open.
    staleTime: 0,
  });
  const status = statusQuery.data;

  return (
    <section className="space-y-3">
      <SectionHeader title="Excluir conta" />
      <p className="text-sm text-muted-foreground">
        Exclui de vez sua conta e todas as organizações em que você é o único
        membro, com todos os projetos e dados. Você sai na hora e a exclusão
        acontece{" "}
        {status ? `${status.deletionDelayDays} dias` : "duas semanas"} depois.
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
        disabled={!status}
        onClick={() => setOpen(true)}
      >
        Excluir conta
      </Button>

      {open && status ? (
        status.blockers.length > 0 ? (
          <BlockedDialog status={status} onClose={() => setOpen(false)} />
        ) : !status.signedInRecently ? (
          <SignInAgainDialog onClose={() => setOpen(false)} />
        ) : (
          <DeleteAccountDialog status={status} onClose={() => setOpen(false)} />
        )
      ) : null}
    </section>
  );
}

function BlockedDialog({
  status,
  onClose,
}: {
  status: Status;
  onClose: () => void;
}) {
  return (
    <AlertDialog open onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Você ainda não pode excluir sua conta</AlertDialogTitle>
          <AlertDialogDescription render={<div />}>
            <ul className="list-disc space-y-1 pl-5 text-left">
              {status.blockers.map((blocker) => (
                <li key={blocker.organizationName}>{blockerText(blocker)}</li>
              ))}
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Fechar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SignInAgainDialog({ onClose }: { onClose: () => void }) {
  return (
    <AlertDialog open onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Entre de novo para continuar</AlertDialogTitle>
          <AlertDialogDescription>
            Por segurança, saia e entre de novo antes de excluir sua conta.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button onClick={() => signOutAndRedirect()}>Sair</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteAccountDialog({
  status,
  onClose,
}: {
  status: Status;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [confirmEmail, setConfirmEmail] = useState("");
  const email = session?.user.email ?? "";
  const matches =
    email !== "" && confirmEmail.trim().toLowerCase() === email.toLowerCase();

  const mutation = useMutation({
    mutationFn: () => requestAccountDeletion({ data: { confirmEmail } }),
    onSuccess: ({ deleteAfter }) => {
      toast.success(
        `Sua conta será excluída em ${formatDeletionDate(deleteAfter)}.`,
      );
      signOutAndRedirect();
    },
    onError: (error) => {
      toast.error(deletionErrorMessage(error));
      // A blocker or an expired sign-in found by the server: reopening the
      // dialog shows the explanation.
      void queryClient.invalidateQueries({
        queryKey: ["accountDeletionStatus"],
      });
      onClose();
    },
  });

  return (
    <AlertDialog
      open
      onOpenChange={(next) => {
        if (!next && !mutation.isPending) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir sua conta?</AlertDialogTitle>
          <AlertDialogDescription>
            Você vai sair agora, e qualquer plano pago ou recarga automática das
            organizações excluídas com sua conta é cancelado. Depois da data de
            exclusão, não dá para desfazer. Digite seu e-mail para confirmar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {status.billingToStop.length > 0 ? (
          <Alert variant="warning">
            <AlertTriangle />
            <AlertTitle>Excluir sua conta encerra as cobranças</AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-5">
                {status.billingToStop.map((charge) => (
                  <li key={charge.organizationName}>{billingText(charge)}</li>
                ))}
              </ul>
              <p className="mt-2">
                Um plano cancelado não renova, e você mantém os créditos até a
                data de exclusão.
              </p>
            </AlertDescription>
          </Alert>
        ) : null}
        <Input
          value={confirmEmail}
          onChange={(event) => setConfirmEmail(event.target.value)}
          placeholder={email}
          aria-label="Seu e-mail"
          autoComplete="off"
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!matches}
            pending={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Excluir conta
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
