import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { organizationContextQueryOptions } from "@/client/features/team/organizationQueries";
import { clearLastProjectId } from "@/client/lib/active-project";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { isClientRole } from "@/lib/org-permissions";
import { switchOrganization } from "@/serverFunctions/organization";

function organizationInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter((word) => /\p{L}/u.test(word.charAt(0)))
      .map((word) => word.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "OR"
  );
}

function displayName(name: string | undefined) {
  return !name || name === "Organization" ? "Minha organização" : name;
}

function roleLabel(role: string) {
  if (isClientRole(role)) return "Cliente";
  if (role.includes("owner")) return "Dono";
  if (role.includes("admin")) return "Administrador";
  return "Membro";
}

/**
 * The organization the projects below belong to (visual direction v2). With
 * more than one organization it opens a selector (board 4c).
 */
export function OrganizationRow({ ready }: { ready: boolean }) {
  const orgQuery = useQuery({
    ...organizationContextQueryOptions(),
    enabled: ready,
  });
  const [switching, setSwitching] = useState(false);
  const label = displayName(orgQuery.data?.organizationName);
  const organizations = orgQuery.data?.organizations ?? [];
  const role = orgQuery.data?.role;

  const body = (
    <>
      <span className="grid size-8 place-items-center rounded-[7px] bg-primary text-[11px] font-bold text-primary-foreground">
        {organizationInitials(label)}
      </span>
      <span className="flex min-w-0 flex-col gap-px leading-tight">
        <span className="truncate text-[13.5px] font-semibold">{label}</span>
        <span className="text-[11.5px] text-faint">
          {role && isClientRole(role) ? "Acesso de cliente" : "Organização"}
        </span>
      </span>
    </>
  );

  if (organizations.length < 2) {
    return (
      <div className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-2.5 py-2.5 pl-3 pr-2.5">
        {body}
      </div>
    );
  }

  const choose = async (organizationId: string) => {
    if (switching || organizationId === orgQuery.data?.organizationId) return;
    setSwitching(true);
    try {
      await switchOrganization({ data: { organizationId } });
      // The remembered project belongs to the old organization.
      clearLastProjectId();
      window.location.assign("/");
    } catch (error) {
      toast.error(getStandardErrorMessage(error));
      setSwitching(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Trocar organização"
        className="grid w-full grid-cols-[32px_minmax(0,1fr)_16px] items-center gap-2.5 py-2.5 pl-3 pr-2.5 text-left hover:bg-secondary"
      >
        {body}
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>Suas organizações</DropdownMenuLabel>
        {organizations.map((organization) => (
          <DropdownMenuItem
            key={organization.organizationId}
            disabled={switching}
            onClick={() => void choose(organization.organizationId)}
            className="flex items-center justify-between gap-2"
          >
            <span className="truncate">
              {displayName(organization.organizationName)}
            </span>
            <span className="shrink-0 text-[11.5px] text-muted-foreground">
              {organization.organizationId === orgQuery.data?.organizationId
                ? "atual"
                : roleLabel(organization.role)}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
