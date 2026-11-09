import { isClientRole } from "@/lib/org-permissions";
import { ProjectAccessRepository } from "@/server/features/access/ProjectAccessRepository";
import { ProjectService } from "@/server/features/projects/services/ProjectService";
import { AppError } from "@/server/lib/errors";

/** Projects must belong to the organization; anything else is refused. */
async function requireOrganizationProjects(
  organizationId: string,
  projectIds: string[],
) {
  const own = new Set(
    (await ProjectService.listProjects(organizationId)).map((p) => p.id),
  );
  if (projectIds.some((id) => !own.has(id))) {
    throw new AppError("NOT_FOUND");
  }
  return [...new Set(projectIds)];
}

/** Turns a client invitation's projects into grants once it is accepted. */
async function grantFromInvitation(input: {
  invitationId: string;
  userId: string;
  organizationId: string;
}) {
  const rows = await ProjectAccessRepository.listInvitationProjects([
    input.invitationId,
  ]);
  await ProjectAccessRepository.replaceForUser(
    input.userId,
    input.organizationId,
    rows.map((row) => row.projectId),
  );
}

async function revokeAll(userId: string, organizationId: string) {
  await ProjectAccessRepository.replaceForUser(userId, organizationId, []);
}

/**
 * The projects the caller may open in the client portal: all of them for
 * agency staff, only the granted ones for a client.
 */
async function listPortalProjectIds(context: {
  userId: string;
  organizationId: string;
  role: string;
}) {
  if (!isClientRole(context.role)) {
    return (await ProjectService.listProjects(context.organizationId)).map(
      (project) => project.id,
    );
  }
  return ProjectAccessRepository.listProjectIdsForUser(
    context.userId,
    context.organizationId,
  );
}

/** The org check already ran in ensure-user; a client also needs a grant. */
async function requirePortalProject(
  context: { userId: string; role: string },
  projectId: string,
) {
  if (!isClientRole(context.role)) return;
  if (!(await ProjectAccessRepository.hasAccess(context.userId, projectId))) {
    throw new AppError("NOT_FOUND");
  }
}

export const ProjectAccessService = {
  requireOrganizationProjects,
  grantFromInvitation,
  revokeAll,
  listPortalProjectIds,
  requirePortalProject,
};
