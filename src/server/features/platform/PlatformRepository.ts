import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  member,
  organization,
  organizationPlatformSettings,
  partnerInvitations,
  platformPlans,
  projects,
  user,
} from "@/db/schema";

/** The installation's first account: the platform owner. */
async function getFirstUserId() {
  const [first] = await db
    .select({ id: user.id })
    .from(user)
    .orderBy(asc(user.createdAt), asc(user.id))
    .limit(1);
  return first?.id ?? null;
}

async function listPlans() {
  return db
    .select()
    .from(platformPlans)
    .orderBy(asc(platformPlans.monthlyQueries), asc(platformPlans.name));
}

async function getPlan(planId: string) {
  const [plan] = await db
    .select()
    .from(platformPlans)
    .where(eq(platformPlans.id, planId))
    .limit(1);
  return plan ?? null;
}

async function insertPlan(input: {
  id: string;
  name: string;
  monthlyQueries: number;
}) {
  await db.insert(platformPlans).values(input);
}

async function updatePlan(input: {
  id: string;
  name: string;
  monthlyQueries: number;
}) {
  await db
    .update(platformPlans)
    .set({ name: input.name, monthlyQueries: input.monthlyQueries })
    .where(eq(platformPlans.id, input.id));
}

async function getOrganizationSettings(organizationId: string) {
  const [row] = await db
    .select({
      planId: organizationPlatformSettings.planId,
      suspendedAt: organizationPlatformSettings.suspendedAt,
      planName: platformPlans.name,
      monthlyQueries: platformPlans.monthlyQueries,
    })
    .from(organizationPlatformSettings)
    .leftJoin(
      platformPlans,
      eq(organizationPlatformSettings.planId, platformPlans.id),
    )
    .where(eq(organizationPlatformSettings.organizationId, organizationId))
    .limit(1);
  return row ?? null;
}

async function upsertOrganizationSettings(input: {
  organizationId: string;
  planId?: string | null;
  suspendedAt?: string | null;
}) {
  const now = new Date().toISOString();
  const { organizationId, ...changes } = input;
  await db
    .insert(organizationPlatformSettings)
    .values({ organizationId, ...changes, updatedAt: now })
    .onConflictDoUpdate({
      target: organizationPlatformSettings.organizationId,
      set: { ...changes, updatedAt: now },
    });
}

/** Every organization with its owner, plan, status and live project count. */
async function listOrganizations() {
  const [orgs, owners, settings, projectCounts] = await Promise.all([
    db
      .select({
        id: organization.id,
        name: organization.name,
        createdAt: organization.createdAt,
      })
      .from(organization)
      .orderBy(asc(organization.createdAt)),
    db
      .select({
        organizationId: member.organizationId,
        email: user.email,
        name: user.name,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.role, "owner")),
    db
      .select({
        organizationId: organizationPlatformSettings.organizationId,
        planId: organizationPlatformSettings.planId,
        suspendedAt: organizationPlatformSettings.suspendedAt,
      })
      .from(organizationPlatformSettings),
    db
      .select({
        organizationId: projects.organizationId,
        projects: count(projects.id),
      })
      .from(projects)
      .where(and(isNull(projects.archivedAt), isNull(projects.draftSince)))
      .groupBy(projects.organizationId),
  ]);
  return orgs.map((org) => {
    const setting = settings.find((row) => row.organizationId === org.id);
    const owner = owners.find((row) => row.organizationId === org.id);
    return {
      id: org.id,
      name: org.name,
      createdAt: org.createdAt.toISOString(),
      ownerEmail: owner?.email ?? null,
      ownerName: owner?.name ?? null,
      planId: setting?.planId ?? null,
      suspendedAt: setting?.suspendedAt ?? null,
      projects:
        projectCounts.find((row) => row.organizationId === org.id)?.projects ??
        0,
    };
  });
}

async function organizationExists(organizationId: string) {
  const [row] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  return row !== undefined;
}

async function insertInvitation(input: {
  id: string;
  tokenHash: string;
  agencyName: string;
  email: string;
  planId: string | null;
  createdByUserId: string;
  expiresAt: string;
}) {
  await db.insert(partnerInvitations).values(input);
}

async function listInvitations() {
  return db
    .select({
      id: partnerInvitations.id,
      agencyName: partnerInvitations.agencyName,
      email: partnerInvitations.email,
      planId: partnerInvitations.planId,
      createdAt: partnerInvitations.createdAt,
      expiresAt: partnerInvitations.expiresAt,
      acceptedAt: partnerInvitations.acceptedAt,
      revokedAt: partnerInvitations.revokedAt,
      organizationId: partnerInvitations.organizationId,
    })
    .from(partnerInvitations)
    .orderBy(desc(partnerInvitations.createdAt));
}

async function getInvitationByTokenHash(tokenHash: string) {
  const [row] = await db
    .select()
    .from(partnerInvitations)
    .where(eq(partnerInvitations.tokenHash, tokenHash))
    .limit(1);
  return row ?? null;
}

async function revokeInvitation(id: string) {
  await db
    .update(partnerInvitations)
    .set({ revokedAt: new Date().toISOString() })
    .where(
      and(eq(partnerInvitations.id, id), isNull(partnerInvitations.acceptedAt)),
    );
}

/**
 * Marks the invitation used, once: returns false when another request
 * already claimed it or it was revoked.
 */
async function claimInvitation(id: string) {
  const claimed = await db
    .update(partnerInvitations)
    .set({ acceptedAt: new Date().toISOString() })
    .where(
      and(
        eq(partnerInvitations.id, id),
        isNull(partnerInvitations.acceptedAt),
        isNull(partnerInvitations.revokedAt),
      ),
    )
    .returning({ id: partnerInvitations.id });
  return claimed.length > 0;
}

async function releaseInvitation(id: string) {
  await db
    .update(partnerInvitations)
    .set({ acceptedAt: null })
    .where(eq(partnerInvitations.id, id));
}

async function setInvitationOrganization(id: string, organizationId: string) {
  await db
    .update(partnerInvitations)
    .set({ organizationId })
    .where(eq(partnerInvitations.id, id));
}

async function findUserIdByEmail(email: string) {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  return row?.id ?? null;
}

export const PlatformRepository = {
  getFirstUserId,
  listPlans,
  getPlan,
  insertPlan,
  updatePlan,
  getOrganizationSettings,
  upsertOrganizationSettings,
  listOrganizations,
  organizationExists,
  insertInvitation,
  listInvitations,
  getInvitationByTokenHash,
  revokeInvitation,
  claimInvitation,
  releaseInvitation,
  setInvitationOrganization,
  findUserIdByEmail,
};
