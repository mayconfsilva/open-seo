import { useQuery } from "@tanstack/react-query";
import { organizationContextQueryOptions } from "@/client/features/team/organizationQueries";

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

/** The organization the projects below belong to (visual direction v2). */
export function OrganizationRow({ ready }: { ready: boolean }) {
  const orgQuery = useQuery({
    ...organizationContextQueryOptions(),
    enabled: ready,
  });
  const name = orgQuery.data?.organizationName;
  const label = !name || name === "Organization" ? "Minha organização" : name;
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-2.5 py-2.5 pl-3 pr-2.5">
      <span className="grid size-8 place-items-center rounded-[7px] bg-primary text-[11px] font-bold text-primary-foreground">
        {organizationInitials(label)}
      </span>
      <span className="flex min-w-0 flex-col gap-px leading-tight">
        <span className="truncate text-[13.5px] font-semibold">{label}</span>
        <span className="text-[11.5px] text-[#7c788c]">Organização</span>
      </span>
    </div>
  );
}
