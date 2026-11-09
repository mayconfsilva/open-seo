import { Crown, FolderLock, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { RowActionsMenu } from "@/client/components/RowActionsMenu";
import { Badge } from "@/client/components/ui/badge";
import { DropdownMenuItem } from "@/client/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/client/components/ui/table";
import { hasOrgPermission, isClientRole } from "@/lib/org-permissions";

const ROLE_LABELS: Record<string, string> = {
  owner: "Dono",
  admin: "Administrador",
  member: "Membro",
  client: "Cliente",
};

/** dataSEO: "Todos" for agency staff, the granted project names for a client. */
function ProjectsCell({
  role,
  projectNames,
}: {
  role: string;
  projectNames: string[];
}) {
  return (
    <TableCell className="max-w-[240px] text-xs text-muted-foreground">
      {isClientRole(role) ? (
        projectNames.length > 0 ? (
          <span className="line-clamp-2">{projectNames.join(", ")}</span>
        ) : (
          <span className="text-destructive">Nenhum projeto</span>
        )
      ) : (
        "Todos"
      )}
    </TableCell>
  );
}

function formatRole(role: string) {
  return role
    .split(",")
    .map((name) => ROLE_LABELS[name.trim()] ?? name.trim())
    .join(", ");
}

export type Member = {
  id: string;
  userId: string;
  role: string;
  user: { name?: string | null; email: string };
};

type Invitation = {
  id: string;
  email: string;
  role?: string | null;
  expiresAt: Date | string;
};

export function MemberRow({
  member,
  isSelf,
  canManageTeam,
  isOwner,
  isRemoving,
  projectNames,
  onRemove,
  onTransferOwnership,
  onEditProjects,
}: {
  member: Member;
  isSelf: boolean;
  canManageTeam: boolean;
  isOwner: boolean;
  isRemoving: boolean;
  projectNames: string[];
  onRemove: () => void;
  onTransferOwnership: () => void;
  onEditProjects: () => void;
}) {
  const memberIsOwner = hasOrgPermission(member.role, {
    billing: ["manage"],
  });
  // Owners are protected server-side (only an owner can touch an owner; the
  // last owner can't be removed) — don't render controls that would just 403.
  const canRemove = canManageTeam && !isSelf && (!memberIsOwner || isOwner);
  // Owners can always remove, so this only ever adds to the remove menu.
  const canTransferOwnership = isOwner && !isSelf && !memberIsOwner;
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);

  return (
    <TableRow>
      <TableCell className="max-w-[280px]">
        <p className="truncate font-medium" data-ph-mask>
          {member.user.name || member.user.email}
          {isSelf ? (
            <span className="font-normal text-muted-foreground"> (você)</span>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted-foreground" data-ph-mask>
          {member.user.email}
        </p>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{formatRole(member.role)}</Badge>
      </TableCell>
      <ProjectsCell role={member.role} projectNames={projectNames} />
      <TableCell className="text-xs text-muted-foreground">Ativo</TableCell>
      <TableCell>
        {canRemove ? (
          <RowActionsMenu label={`Ações para ${member.user.email}`}>
            {isClientRole(member.role) ? (
              <DropdownMenuItem onClick={onEditProjects}>
                <FolderLock />
                Editar projetos liberados
              </DropdownMenuItem>
            ) : null}
            {canTransferOwnership ? (
              <DropdownMenuItem onClick={onTransferOwnership}>
                <Crown />
                Transferir propriedade
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              variant="destructive"
              disabled={isRemoving}
              onClick={() => setIsConfirmingRemove(true)}
            >
              <Trash2 />
              Remover acesso
            </DropdownMenuItem>
          </RowActionsMenu>
        ) : null}
        {isConfirmingRemove ? (
          <ConfirmDialog
            title={`Remover o acesso de ${member.user.email}?`}
            confirmLabel="Remover acesso"
            destructive
            onClose={() => setIsConfirmingRemove(false)}
            onConfirm={() => {
              setIsConfirmingRemove(false);
              onRemove();
            }}
          >
            A pessoa perde o acesso na hora, a todos os projetos. Conexões do
            Search Console e do Google Analytics feitas com a conta Google dela
            são desconectadas.
          </ConfirmDialog>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

export function InvitationRow({
  invitation,
  canManageTeam,
  isResending,
  isCanceling,
  projectNames,
  onResend,
  onCancel,
}: {
  invitation: Invitation;
  projectNames: string[];
  canManageTeam: boolean;
  isResending: boolean;
  isCanceling: boolean;
  onResend: () => void;
  onCancel: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px]">
        <p className="truncate font-medium" data-ph-mask>
          {invitation.email}
        </p>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">
          {formatRole(invitation.role ?? "member")}
        </Badge>
      </TableCell>
      <ProjectsCell
        role={invitation.role ?? "member"}
        projectNames={projectNames}
      />
      <TableCell className="text-xs text-muted-foreground">
        Convidado &middot; vence em{" "}
        {new Date(invitation.expiresAt).toLocaleDateString("pt-BR")}
      </TableCell>
      <TableCell>
        {canManageTeam ? (
          <RowActionsMenu label={`Ações para o convite de ${invitation.email}`}>
            <DropdownMenuItem disabled={isResending} onClick={onResend}>
              <Send />
              Reenviar convite
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={isCanceling}
              onClick={onCancel}
            >
              <Trash2 />
              Cancelar convite
            </DropdownMenuItem>
          </RowActionsMenu>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
