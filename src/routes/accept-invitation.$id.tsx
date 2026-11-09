import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/client/components/Spinner";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  AuthPageCard,
  AuthPageShell,
  authSubmitClassName,
} from "@/client/features/auth/AuthPage";
import { clearLastProjectId } from "@/client/lib/active-project";
import { captureClientEvent } from "@/client/lib/posthog";
import { authClient, signOutAndRedirect, useSession } from "@/lib/auth-client";
import { usesBetterAuthClient } from "@/lib/auth-mode";
import { pageHead } from "@/client/lib/pageHead";

export const Route = createFileRoute("/accept-invitation/$id")({
  head: () => pageHead("Aceitar convite"),
  beforeLoad: () => {
    if (!usesBetterAuthClient()) {
      throw notFound();
    }
  },
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  const { id } = Route.useParams();
  const { data: session, isPending: isSessionPending } = useSession();

  return (
    <AuthPageShell>
      {isSessionPending ? (
        <Spinner />
      ) : session?.user ? (
        <InvitationCard invitationId={id} userEmail={session.user.email} />
      ) : (
        <SignedOutInvitationCard invitationId={id} />
      )}
    </AuthPageShell>
  );
}

// getInvitation requires a session matching the invited email, so a
// logged-out visitor gets a generic shell — no invitation details are
// exposed pre-auth by design.
function SignedOutInvitationCard({ invitationId }: { invitationId: string }) {
  const redirect = `/accept-invitation/${invitationId}`;

  return (
    <AuthPageCard title="Você foi convidado">
      <p className="text-sm text-muted-foreground">
        Você recebeu um convite para entrar numa organização no dataSEO. Para
        aceitar, entre com o e-mail que recebeu o convite ou crie uma conta com
        ele.
      </p>
      <div className="space-y-2">
        <Button
          nativeButton={false}
          render={<Link to="/sign-up" search={{ redirect }} />}
          variant="secondary"
          className={authSubmitClassName}
        >
          Criar conta
        </Button>
        <Button
          nativeButton={false}
          render={<Link to="/sign-in" search={{ redirect }} />}
          variant="ghost"
          className="w-full"
        >
          Entrar
        </Button>
      </div>
    </AuthPageCard>
  );
}

function InvitationCard({
  invitationId,
  userEmail,
}: {
  invitationId: string;
  userEmail: string;
}) {
  const [pendingAction, setPendingAction] = useState<
    "accept" | "decline" | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

  const invitationQuery = useQuery({
    queryKey: ["invitation", invitationId],
    queryFn: async () => {
      const result = await authClient.organization.getInvitation({
        query: { id: invitationId },
      });
      if (result.error) {
        throw new Error(result.error.message || "Convite não encontrado");
      }
      return result.data;
    },
    retry: false,
  });

  async function handleAccept() {
    setActionError(null);
    setPendingAction("accept");
    try {
      const accepted = await authClient.organization.acceptInvitation({
        invitationId,
      });
      if (accepted.error) {
        setActionError(
          accepted.error.message || "Não foi possível aceitar o convite.",
        );
        setPendingAction(null);
        return;
      }

      // Accepting updates the session row but not the session cookie cache;
      // setActive refreshes the cookie so the app opens in the joined org
      // immediately instead of after the cache expires. The invitation is
      // already accepted here, so a failed refresh must not report otherwise.
      await authClient.organization
        .setActive({
          organizationId: accepted.data.invitation.organizationId,
        })
        .catch(() => undefined);
      captureClientEvent("team:invitation_accept");
      // Full navigation: every cached query in this tab, and the remembered
      // project, belong to the old workspace.
      clearLastProjectId();
      window.location.assign("/");
    } catch {
      setActionError("Não foi possível aceitar o convite. Tente de novo.");
      setPendingAction(null);
    }
  }

  async function handleDecline() {
    setActionError(null);
    setPendingAction("decline");
    try {
      const result = await authClient.organization.rejectInvitation({
        invitationId,
      });
      if (result.error) {
        setActionError(
          result.error.message || "Não foi possível recusar o convite.",
        );
        setPendingAction(null);
        return;
      }
      captureClientEvent("team:invitation_decline");
      setDeclined(true);
    } catch {
      setActionError("Não foi possível recusar o convite. Tente de novo.");
      setPendingAction(null);
    }
  }

  if (invitationQuery.isPending) {
    return (
      <AuthPageCard title="Conferindo o convite...">
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      </AuthPageCard>
    );
  }

  if (invitationQuery.isError) {
    return (
      <AuthPageCard title="Convite indisponível">
        <p className="text-sm text-muted-foreground">
          Este convite pode ter expirado, sido cancelado ou ser de outro e-mail.
          Você entrou como{" "}
          <span className="font-medium" data-ph-mask>
            {userEmail}
          </span>
          .
        </p>
        <p className="text-sm text-muted-foreground">
          Se o convite foi para outro endereço, saia e entre com esse e-mail. Se
          não, peça um novo convite a quem enviou.
        </p>
        <div className="space-y-2">
          <Button
            type="button"
            variant="secondary"
            className={authSubmitClassName}
            onClick={() => {
              // Signs out, then lands on sign-in with a redirect back to this
              // invitation (staying signed in would bounce straight back here).
              signOutAndRedirect();
            }}
          >
            Usar outra conta
          </Button>
          <Button
            nativeButton={false}
            render={<Link to="/" />}
            variant="ghost"
            className="w-full"
          >
            Ir para o início
          </Button>
        </div>
      </AuthPageCard>
    );
  }

  if (declined) {
    return (
      <AuthPageCard title="Convite recusado">
        <p className="text-sm text-muted-foreground">
          Você recusou o convite para entrar em{" "}
          <span className="font-medium">
            {invitationQuery.data.organizationName}
          </span>
          .
        </p>
        <Button
          nativeButton={false}
          render={<Link to="/" />}
          variant="ghost"
          className="w-full"
        >
          Ir para o início
        </Button>
      </AuthPageCard>
    );
  }

  return (
    <AuthPageCard title="Entrar na organização">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium" data-ph-mask>
          {invitationQuery.data.inviterEmail}
        </span>{" "}
        convidou você para entrar em{" "}
        <span className="font-medium">
          {invitationQuery.data.organizationName}
        </span>{" "}
        no dataSEO.
      </p>
      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Button
          type="button"
          variant="secondary"
          className={authSubmitClassName}
          pending={pendingAction === "accept"}
          disabled={pendingAction !== null}
          onClick={() => void handleAccept()}
        >
          {pendingAction === "accept" ? "Entrando..." : "Aceitar convite"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          pending={pendingAction === "decline"}
          disabled={pendingAction !== null}
          onClick={() => void handleDecline()}
        >
          {pendingAction === "decline" ? "Recusando..." : "Recusar"}
        </Button>
      </div>
    </AuthPageCard>
  );
}
