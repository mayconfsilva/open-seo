import { getAuth } from "@/lib/auth";
import { toHex } from "@/server/auth/org-slug";
import { AppError } from "@/server/lib/errors";
import { DEFAULT_PLAN } from "@/shared/plan-usage";
import { PlatformRepository } from "./PlatformRepository";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

/** The platform owner is the installation's first account. */
async function isPlatformAdmin(userId: string) {
  return (await PlatformRepository.getFirstUserId()) === userId;
}

async function assertPlatformAdmin(userId: string) {
  if (!(await isPlatformAdmin(userId))) throw new AppError("FORBIDDEN");
}

async function isOrganizationSuspended(organizationId: string) {
  const settings =
    await PlatformRepository.getOrganizationSettings(organizationId);
  return settings?.suspendedAt != null;
}

async function getOverview() {
  const [plans, organizations, invitations] = await Promise.all([
    PlatformRepository.listPlans(),
    PlatformRepository.listOrganizations(),
    PlatformRepository.listInvitations(),
  ]);
  return { defaultPlan: DEFAULT_PLAN, plans, organizations, invitations };
}

async function savePlan(input: {
  id?: string;
  name: string;
  monthlyQueries: number;
}) {
  if (input.id) {
    if (!(await PlatformRepository.getPlan(input.id))) {
      throw new AppError("NOT_FOUND");
    }
    await PlatformRepository.updatePlan({ ...input, id: input.id });
    return;
  }
  await PlatformRepository.insertPlan({ ...input, id: crypto.randomUUID() });
}

async function assertPlanExists(planId: string | null) {
  if (planId && !(await PlatformRepository.getPlan(planId))) {
    throw new AppError("NOT_FOUND");
  }
}

async function setOrganizationPlan(
  organizationId: string,
  planId: string | null,
) {
  if (!(await PlatformRepository.organizationExists(organizationId))) {
    throw new AppError("NOT_FOUND");
  }
  await assertPlanExists(planId);
  await PlatformRepository.upsertOrganizationSettings({
    organizationId,
    planId,
  });
}

async function setOrganizationSuspended(input: {
  organizationId: string;
  suspended: boolean;
  actorOrganizationId: string;
}) {
  if (input.suspended && input.organizationId === input.actorOrganizationId) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Você não pode suspender a sua própria organização.",
    );
  }
  if (!(await PlatformRepository.organizationExists(input.organizationId))) {
    throw new AppError("NOT_FOUND");
  }
  await PlatformRepository.upsertOrganizationSettings({
    organizationId: input.organizationId,
    suspendedAt: input.suspended ? new Date().toISOString() : null,
  });
}

/** Creates a single-use link; the token is returned once and only its hash is kept. */
async function createInvitation(input: {
  agencyName: string;
  email: string;
  planId: string | null;
  createdByUserId: string;
}) {
  await assertPlanExists(input.planId);
  const token = randomToken();
  await PlatformRepository.insertInvitation({
    id: crypto.randomUUID(),
    tokenHash: await sha256Hex(token),
    agencyName: input.agencyName,
    email: input.email.toLowerCase(),
    planId: input.planId,
    createdByUserId: input.createdByUserId,
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS).toISOString(),
  });
  return { token };
}

async function findOpenInvitation(token: string) {
  const invitation = await PlatformRepository.getInvitationByTokenHash(
    await sha256Hex(token),
  );
  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.revokedAt ||
    invitation.expiresAt < new Date().toISOString()
  ) {
    return null;
  }
  return invitation;
}

/** What the public invitation page shows before the partner signs up. */
async function describeInvitation(token: string) {
  const invitation = await findOpenInvitation(token);
  if (!invitation) return null;
  return { agencyName: invitation.agencyName, email: invitation.email };
}

/**
 * Creates the partner's account, their organization (they own it) and its
 * plan, and spends the link. The caller signs in afterwards.
 */
async function acceptInvitation(input: {
  token: string;
  name: string;
  password: string;
}) {
  const invitation = await findOpenInvitation(input.token);
  if (!invitation) throw new AppError("NOT_FOUND");
  if (await PlatformRepository.findUserIdByEmail(invitation.email)) {
    throw new AppError(
      "CONFLICT",
      "Já existe uma conta com este e-mail. Peça outro convite ao administrador.",
    );
  }
  if (!(await PlatformRepository.claimInvitation(invitation.id))) {
    throw new AppError("NOT_FOUND");
  }

  try {
    const auth = getAuth();
    const context = await auth.$context;
    const hash = await context.password.hash(input.password);
    const user = await context.internalAdapter.createUser({
      email: invitation.email,
      name: input.name,
      emailVerified: true,
    });
    await context.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: hash,
    });
    const created = await auth.api.createOrganization({
      body: {
        name: invitation.agencyName,
        slug: `org-${toHex(user.id)}`,
        userId: user.id,
      },
    });
    if (!created) throw new Error("Organization was not created");
    await PlatformRepository.upsertOrganizationSettings({
      organizationId: created.id,
      planId: invitation.planId,
    });
    await PlatformRepository.setInvitationOrganization(
      invitation.id,
      created.id,
    );
    return { email: invitation.email };
  } catch (error) {
    // Let the partner try again with the same link.
    await PlatformRepository.releaseInvitation(invitation.id);
    throw error;
  }
}

export const PlatformService = {
  isPlatformAdmin,
  assertPlatformAdmin,
  isOrganizationSuspended,
  getOverview,
  savePlan,
  setOrganizationPlan,
  setOrganizationSuspended,
  createInvitation,
  revokeInvitation: PlatformRepository.revokeInvitation,
  describeInvitation,
  acceptInvitation,
};
