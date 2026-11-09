import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { APIError } from "better-auth/api";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { getAuth, getHostedBaseUrl } from "@/lib/auth";
import { isEveryAppAuthMode, isHostedAuthMode } from "@/lib/auth-mode";
import { hasOrgPermission, isClientRole } from "@/lib/org-permissions";
import { consumeInvitationSendBudget } from "@/server/auth/invitation-send-limit";
import { requireOrgPermission } from "@/server/auth/org-gate";
import { transferOrganizationOwnership } from "@/server/auth/ownership-transfer";
import { AuthRepository } from "@/server/auth/repositories/AuthRepository";
import { sendHostedInvitationEmail } from "@/server/email/loops";
import { ProjectService } from "@/server/features/projects/services/ProjectService";
import { AppError } from "@/server/lib/errors";
import { ProjectAccessRepository } from "@/server/features/access/ProjectAccessRepository";
import { ProjectAccessService } from "@/server/features/access/ProjectAccessService";
import {
  requireAuthenticatedContext,
  requireMemberContext,
} from "@/serverFunctions/middleware";

/** Teams, invitations and ownership live on the Every App gateway. */
function refuseBehindEveryAppGateway() {
  if (isEveryAppAuthMode(env.AUTH_MODE)) throw new AppError("NOT_FOUND");
}

// The client's source of truth for "who am I in this organization": the active
// org, the caller's role from their member row (resolved server-side by
// ensure-user), and every organization they belong to (for the switcher). Used
// to gate billing/team UI; the server functions and better-auth endpoints
// re-enforce every permission regardless.
//
// Behind an Every App gateway the gateway owns organizations, teams and
// invitations: the request's signed identity names the one organization and
// role, member rows are never listed or trusted, and the team functions below
// refuse (the UI that calls them is hosted-only).
export const getOrganizationContext = createServerFn({ method: "GET" })
  .middleware(requireMemberContext)
  .handler(async ({ context }) => {
    if (isEveryAppAuthMode(env.AUTH_MODE)) {
      const organizationName = "Organization";
      return {
        organizationId: context.organizationId,
        organizationName,
        role: context.role,
        organizations: [
          {
            organizationId: context.organizationId,
            organizationName,
            role: context.role,
          },
        ],
      };
    }
    const memberships = await AuthRepository.listMembershipsForUser(
      context.userId,
    );
    const active = memberships.find(
      (membership) => membership.organizationId === context.organizationId,
    );

    return {
      organizationId: context.organizationId,
      organizationName: active?.organizationName ?? "Organization",
      role: context.role,
      organizations: memberships,
    };
  });

// Team data for the organization settings tab. Pending invitations are
// sensitive (invitee emails, inviter ids) and should only be visible to callers
// who can manage invitations; the server filters them here so the client cannot
// bypass the gate by calling the underlying endpoint directly.
export const getTeam = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) => {
    refuseBehindEveryAppGateway();
    const fullOrganization = await getAuth().api.getFullOrganization({
      headers: getRequest().headers,
      query: { organizationId: context.organizationId },
    });
    if (!fullOrganization) {
      throw new AppError("NOT_FOUND");
    }

    const canViewInvitations = hasOrgPermission(context.role, {
      invitation: ["create"],
    });
    const now = Date.now();
    const pendingInvitations = canViewInvitations
      ? (fullOrganization.invitations ?? []).filter(
          (invitation) =>
            invitation.status === "pending" &&
            new Date(invitation.expiresAt).getTime() > now,
        )
      : [];

    // dataSEO: which projects each client (or client invitation) can read.
    const [projectAccess, invitationProjects] = await Promise.all([
      ProjectAccessRepository.listForOrganization(context.organizationId),
      ProjectAccessRepository.listInvitationProjects(
        pendingInvitations.map((invitation) => invitation.id),
      ),
    ]);

    return {
      members: fullOrganization.members ?? [],
      pendingInvitations,
      projectAccess,
      invitationProjects,
    };
  });

const switchOrganizationSchema = z.object({
  organizationId: z.string().min(1),
});

// Make one of the user's organizations active and persist the choice so the
// next sign-in lands in the same org (session hook reads
// user.lastActiveOrganizationId).
async function activateOrganization(userId: string, organizationId: string) {
  refuseBehindEveryAppGateway();
  const membership = await AuthRepository.getMembership(userId, organizationId);
  if (!membership) {
    throw new AppError("NOT_FOUND");
  }

  await getAuth().api.setActiveOrganization({
    headers: getRequest().headers,
    body: { organizationId },
  });
  await AuthRepository.setLastActiveOrganization(userId, organizationId);
}

export const switchOrganization = createServerFn({ method: "POST" })
  .middleware(requireMemberContext)
  .validator(switchOrganizationSchema)
  .handler(async ({ data, context }) => {
    await activateOrganization(context.userId, data.organizationId);
    return { organizationId: data.organizationId };
  });

// A link to a project in another of the user's organizations (one an agent
// set up as a guest, then claimed, or a teammate's) opens it in that
// organization instead of bouncing to the active one's home page.
export const switchToProjectOrganization = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const organizationId = await ProjectService.getProjectOrganizationId(
      data.projectId,
    );
    if (!organizationId) throw new AppError("NOT_FOUND");
    await activateOrganization(context.userId, organizationId);
    return { organizationId };
  });

const sendInvitationSchema = z
  .object({
    email: z.string().email(),
    // dataSEO: a client reads only the projects listed here.
    role: z.enum(["admin", "client"]).default("admin"),
    projectIds: z.array(z.string().min(1)).max(200).default([]),
  })
  .refine((data) => data.role !== "client" || data.projectIds.length > 0, {
    message: "Escolha ao menos um projeto para o cliente.",
    path: ["projectIds"],
  });

// Invite (or re-invite) a teammate. better-auth creates the pending
// invitation — its server-side checks (inviter must be a member with invite
// permission, admin-only role lock, 20-pending cap) all still run — but the
// email is sent here rather than via the plugin's sendInvitationEmail
// callback: better-auth swallows throws from that callback, so a failed send
// would still read as "sent". Here it fails the call. resend: true re-mails
// an existing pending invitation with the same link and a refreshed expiry.
export const sendTeamInvitation = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(sendInvitationSchema)
  .handler(async ({ data, context }) => {
    refuseBehindEveryAppGateway();
    // Defense in depth: fail-closed locally before touching the rate-limit
    // budget or calling the plugin, so the budget cannot be exhausted by
    // low-privilege callers.
    requireOrgPermission(context, { invitation: ["create"] });

    const projectIds =
      data.role === "client"
        ? await ProjectAccessService.requireOrganizationProjects(
            context.organizationId,
            data.projectIds,
          )
        : [];

    await consumeInvitationSendBudget(context.organizationId, data.email);

    const invitation = await getAuth()
      .api.createInvitation({
        headers: getRequest().headers,
        body: {
          email: data.email,
          role: data.role,
          resend: true,
          // Bind the invitation to the request's resolved org, not the session's
          // active-organization hint, which can be stale after a switch.
          organizationId: context.organizationId,
        },
      })
      .catch((error: unknown) => {
        // The invite dialog shows this one inline, next to the email.
        if (
          error instanceof APIError &&
          error.body?.code === "USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION"
        ) {
          throw new AppError("CONFLICT");
        }
        throw error;
      });

    // A resend keeps the pending invitation (and its role) as it was, so
    // only a client invite with projects touches the list.
    if (data.role === "client") {
      await ProjectAccessRepository.replaceInvitationProjects(
        invitation.id,
        projectIds,
      );
    }

    const [inviter, memberships] = await Promise.all([
      AuthRepository.getHostedUser(context.userId),
      AuthRepository.listMembershipsForUser(context.userId),
    ]);
    const organizationName =
      memberships.find(
        (membership) => membership.organizationId === context.organizationId,
      )?.organizationName ?? "Organization";
    const inviteUrl = `${getHostedBaseUrl()}/accept-invitation/${invitation.id}`;

    // Password mode has no email transport: the inviter passes the link on.
    if (!isHostedAuthMode(env.AUTH_MODE)) {
      return { invitationId: invitation.id, inviteUrl };
    }

    try {
      await sendHostedInvitationEmail({
        email: data.email,
        inviteUrl,
        organizationName,
        inviterName: inviter?.name?.trim() || context.userEmail,
        inviterEmail: context.userEmail,
      });
    } catch (error) {
      // The invitation row exists and stays pending — surface the send
      // failure so the inviter retries instead of assuming it landed.
      console.error("Invitation email send failed:", error);
      throw new AppError("UPSTREAM_UNAVAILABLE");
    }

    return { invitationId: invitation.id, inviteUrl: undefined };
  });

const transferOwnershipSchema = z.object({ memberId: z.string().min(1) });

// Owner-only. Runs here rather than through better-auth's update-member-role,
// which can't swap two roles atomically and refuses owner grants (see the
// beforeUpdateMemberRole hook in auth.ts).
export const transferOwnership = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(transferOwnershipSchema)
  .handler(async ({ data, context }) => {
    refuseBehindEveryAppGateway();
    await transferOrganizationOwnership(context, data.memberId);
    return { memberId: data.memberId };
  });

const setClientProjectsSchema = z.object({
  userId: z.string().min(1),
  projectIds: z.array(z.string().min(1)).max(200),
});

// dataSEO: change which projects a client member can read. An empty list
// leaves them in the organization with nothing to open.
export const setClientProjects = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(setClientProjectsSchema)
  .handler(async ({ data, context }) => {
    refuseBehindEveryAppGateway();
    requireOrgPermission(context, { member: ["update"] });
    const membership = await AuthRepository.getMembership(
      data.userId,
      context.organizationId,
    );
    if (!membership || !isClientRole(membership.role)) {
      throw new AppError("NOT_FOUND");
    }
    const projectIds = await ProjectAccessService.requireOrganizationProjects(
      context.organizationId,
      data.projectIds,
    );
    await ProjectAccessRepository.replaceForUser(
      data.userId,
      context.organizationId,
      projectIds,
    );
    return { projectIds };
  });
