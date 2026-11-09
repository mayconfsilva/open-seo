import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { invitationProjects, projectAccess, projects } from "@/db/schema";

/** Projects of the organization a client may read. */
async function listProjectIdsForUser(userId: string, organizationId: string) {
  const rows = await db
    .select({ projectId: projectAccess.projectId })
    .from(projectAccess)
    .innerJoin(projects, eq(projects.id, projectAccess.projectId))
    .where(
      and(
        eq(projectAccess.userId, userId),
        eq(projects.organizationId, organizationId),
      ),
    );
  return rows.map((row) => row.projectId);
}

async function hasAccess(userId: string, projectId: string) {
  const rows = await db
    .select({ projectId: projectAccess.projectId })
    .from(projectAccess)
    .where(
      and(
        eq(projectAccess.userId, userId),
        eq(projectAccess.projectId, projectId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Every client grant on the organization's projects, for the team screen. */
async function listForOrganization(organizationId: string) {
  return db
    .select({
      userId: projectAccess.userId,
      projectId: projectAccess.projectId,
    })
    .from(projectAccess)
    .innerJoin(projects, eq(projects.id, projectAccess.projectId))
    .where(eq(projects.organizationId, organizationId));
}

async function listInvitationProjects(invitationIds: string[]) {
  if (invitationIds.length === 0) return [];
  return db
    .select({
      invitationId: invitationProjects.invitationId,
      projectId: invitationProjects.projectId,
    })
    .from(invitationProjects)
    .where(inArray(invitationProjects.invitationId, invitationIds));
}

/**
 * Replace the client's grants inside one organization. Grants on other
 * organizations' projects are left alone.
 */
async function replaceForUser(
  userId: string,
  organizationId: string,
  projectIds: string[],
) {
  const current = await listProjectIdsForUser(userId, organizationId);
  const removed = current.filter((id) => !projectIds.includes(id));
  if (removed.length > 0) {
    await db
      .delete(projectAccess)
      .where(
        and(
          eq(projectAccess.userId, userId),
          inArray(projectAccess.projectId, removed),
        ),
      );
  }
  const added = projectIds.filter((id) => !current.includes(id));
  if (added.length > 0) {
    await db
      .insert(projectAccess)
      .values(added.map((projectId) => ({ projectId, userId })))
      .onConflictDoNothing();
  }
}

async function replaceInvitationProjects(
  invitationId: string,
  projectIds: string[],
) {
  await db
    .delete(invitationProjects)
    .where(eq(invitationProjects.invitationId, invitationId));
  if (projectIds.length === 0) return;
  await db
    .insert(invitationProjects)
    .values(projectIds.map((projectId) => ({ invitationId, projectId })))
    .onConflictDoNothing();
}

export const ProjectAccessRepository = {
  listProjectIdsForUser,
  hasAccess,
  listForOrganization,
  listInvitationProjects,
  replaceForUser,
  replaceInvitationProjects,
};
