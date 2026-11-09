import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SectionHeader } from "@/client/components/PageHeader";
import { PermissionHint } from "@/client/components/PermissionHint";
import { QueryError } from "@/client/components/QueryState";
import { SkeletonCard } from "@/client/components/SkeletonPresets";
import { Button } from "@/client/components/ui/button";
import {
  Table,
  TableBody,
  TableCard,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import {
  InviteTeammateModal,
  announceInvitation,
  inviteErrorMessage,
} from "@/client/features/team/InviteTeammateModal";
import { organizationContextQueryOptions } from "@/client/features/team/organizationQueries";
import {
  InvitationRow,
  MemberRow,
  type Member,
} from "@/client/features/team/TeamTableRows";
import { TransferOwnershipModal } from "@/client/features/team/TransferOwnershipModal";
import { ClientProjectsDialog } from "@/client/features/team/ClientProjectsDialog";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { captureClientEvent } from "@/client/lib/posthog";
import { authClient, useSession } from "@/lib/auth-client";
import { hasOrgPermission } from "@/lib/org-permissions";
import { getTeam, sendTeamInvitation } from "@/serverFunctions/organization";

const RESEND_KEY = ["team", "resend-invitation"];
const REMOVE_KEY = ["team", "remove-member"];
const CANCEL_KEY = ["team", "cancel-invitation"];

// Every in-flight call for one action, so each row stays disabled while its
// own request runs even when another row starts the same action.
function usePendingVariables(mutationKey: string[]) {
  return useMutationState({
    filters: { mutationKey, status: "pending" },
    select: (mutation) => mutation.state.variables,
  });
}

function grantsFor(rows: Array<{ projectId: string }>) {
  return rows.map((row) => row.projectId);
}

// The Organization tab of account settings: who has access to the active org.
export function TeamSettings() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<Member | null>(null);
  const [projectsTarget, setProjectsTarget] = useState<Member | null>(null);
  const projectsQuery = useQuery(projectsQueryOptions());
  const projects = (projectsQuery.data ?? []).filter(
    (project) => project.domain !== null && !project.draftSince,
  );
  const projectName = new Map(
    (projectsQuery.data ?? []).map((project) => [project.id, project.name]),
  );

  const orgContextQuery = useQuery(organizationContextQueryOptions());

  const teamQuery = useQuery({
    queryKey: ["organization-team", orgContextQuery.data?.organizationId],
    queryFn: () => getTeam(),
    enabled: orgContextQuery.data?.organizationId !== undefined,
  });

  const refreshTeam = () =>
    queryClient.invalidateQueries({
      queryKey: ["organization-team", orgContextQuery.data?.organizationId],
    });

  // Same server call as inviting: for an already-pending address it re-mails
  // the same link with a refreshed expiry.
  const resendMutation = useMutation({
    mutationKey: RESEND_KEY,
    mutationFn: (invitation: {
      email: string;
      role: "admin" | "client";
      projectIds: string[];
    }) => sendTeamInvitation({ data: invitation }),
    onSuccess: (result) => {
      captureClientEvent("team:invitation_resend");
      announceInvitation(result, "Convite reenviado");
      void refreshTeam();
    },
    onError: (error: Error) => {
      toast.error(inviteErrorMessage(error));
    },
  });

  const removeMemberMutation = useMutation({
    mutationKey: REMOVE_KEY,
    mutationFn: async (memberId: string) => {
      const result = await authClient.organization.removeMember({
        memberIdOrEmail: memberId,
      });
      if (result.error) {
        throw new Error(result.error.message || "Não foi possível remover");
      }
    },
    onSuccess: () => {
      captureClientEvent("team:member_remove");
      toast.success("Acesso removido");
      void refreshTeam();
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationKey: CANCEL_KEY,
    mutationFn: async (invitationId: string) => {
      const result = await authClient.organization.cancelInvitation({
        invitationId,
      });
      if (result.error) {
        throw new Error(
          result.error.message || "Não foi possível cancelar o convite",
        );
      }
    },
    onSuccess: () => {
      captureClientEvent("team:invitation_cancel");
      toast.success("Convite cancelado");
      void refreshTeam();
    },
  });

  const pendingResends = usePendingVariables(RESEND_KEY);
  const pendingRemovals = usePendingVariables(REMOVE_KEY);
  const pendingCancels = usePendingVariables(CANCEL_KEY);

  const role = orgContextQuery.data?.role ?? "member";
  const canManageTeam = hasOrgPermission(role, { invitation: ["create"] });
  // billing:manage is the owner-only statement (organization:delete is
  // disabled app-wide, so it would read as a dead capability).
  const isOwner = hasOrgPermission(role, { billing: ["manage"] });

  const members = teamQuery.data?.members ?? [];
  const pendingInvitations = teamQuery.data?.pendingInvitations ?? [];
  const memberProjects = (userId: string) =>
    grantsFor(
      (teamQuery.data?.projectAccess ?? []).filter(
        (row) => row.userId === userId,
      ),
    );
  const invitationProjectIds = (invitationId: string) =>
    grantsFor(
      (teamQuery.data?.invitationProjects ?? []).filter(
        (row) => row.invitationId === invitationId,
      ),
    );
  const names = (ids: string[]) =>
    ids.flatMap((id) => {
      const name = projectName.get(id);
      return name ? [name] : [];
    });

  // The team query waits on the org context, so a failed context would
  // otherwise leave the team spinner up for good. A failed refetch keeps the
  // loaded table, with the error above it.
  const failedQuery = [orgContextQuery, teamQuery].find(
    (query) => query.isError,
  );
  const loadError = failedQuery ? (
    <QueryError
      error={failedQuery.error}
      fallback="Não foi possível carregar a equipe agora."
      onRetry={() => void failedQuery.refetch()}
      isRetrying={failedQuery.isFetching}
    />
  ) : null;
  if (failedQuery && failedQuery.data === undefined) return loadError;

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Pessoas com acesso"
        action={
          canManageTeam ? (
            <Button size="sm" onClick={() => setIsInviteOpen(true)}>
              Convidar pessoa
            </Button>
          ) : null
        }
      />
      <p className="text-sm text-muted-foreground">
        A equipe da agência vê e edita todos os projetos (só o dono mexe na
        cobrança). Clientes veem, só para leitura, os projetos liberados para
        eles, pelo portal do cliente.
      </p>
      {orgContextQuery.isSuccess && !canManageTeam ? (
        <PermissionHint action="convidar ou remover pessoas" />
      ) : null}
      {loadError}

      {teamQuery.isPending ? (
        <SkeletonCard />
      ) : (
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Projetos</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isSelf={member.userId === session?.user?.id}
                  canManageTeam={canManageTeam}
                  isOwner={isOwner}
                  isRemoving={pendingRemovals.includes(member.id)}
                  projectNames={names(memberProjects(member.userId))}
                  onRemove={() => removeMemberMutation.mutate(member.id)}
                  onTransferOwnership={() => setTransferTarget(member)}
                  onEditProjects={() => setProjectsTarget(member)}
                />
              ))}
              {pendingInvitations.map((invitation) => (
                <InvitationRow
                  key={invitation.id}
                  invitation={invitation}
                  canManageTeam={canManageTeam}
                  isResending={pendingResends.some(
                    (pending) =>
                      typeof pending === "object" &&
                      pending !== null &&
                      "email" in pending &&
                      pending.email === invitation.email,
                  )}
                  isCanceling={pendingCancels.includes(invitation.id)}
                  projectNames={names(invitationProjectIds(invitation.id))}
                  onResend={() =>
                    resendMutation.mutate({
                      email: invitation.email,
                      role: invitation.role === "client" ? "client" : "admin",
                      projectIds: invitationProjectIds(invitation.id),
                    })
                  }
                  onCancel={() =>
                    cancelInvitationMutation.mutate(invitation.id)
                  }
                />
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}

      {transferTarget ? (
        <TransferOwnershipModal
          member={transferTarget}
          onClose={() => setTransferTarget(null)}
          onTransferred={() => {
            // The caller's own role changed too: refresh the org context that
            // gates the team and billing UI, not only the member list.
            void refreshTeam();
            void queryClient.invalidateQueries({
              queryKey: organizationContextQueryOptions().queryKey,
            });
          }}
        />
      ) : null}

      {projectsTarget ? (
        <ClientProjectsDialog
          userId={projectsTarget.userId}
          email={projectsTarget.user.email}
          projects={projects}
          initial={memberProjects(projectsTarget.userId)}
          onClose={() => setProjectsTarget(null)}
          onSaved={() => void refreshTeam()}
        />
      ) : null}

      {isInviteOpen ? (
        <InviteTeammateModal
          onClose={() => setIsInviteOpen(false)}
          onInvited={() => void refreshTeam()}
        />
      ) : null}
    </section>
  );
}
