import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { getAuthMode } from "@/lib/auth-mode";
import { PlatformService } from "@/server/features/platform/PlatformService";
import { AppError } from "@/server/lib/errors";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

// dataSEO: the platform owner's screen (partners, invitations, plans). Only
// accounts mode has partners, and only the installation's first account may
// manage them.
async function assertPlatformOwner(userId: string) {
  if (getAuthMode(env.AUTH_MODE) !== "password")
    throw new AppError("NOT_FOUND");
  await PlatformService.assertPlatformAdmin(userId);
}

/** Whether the signed-in person sees the Plataforma screen. */
export const getPlatformAccess = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) => ({
    isPlatformAdmin:
      getAuthMode(env.AUTH_MODE) === "password" &&
      (await PlatformService.isPlatformAdmin(context.userId)),
  }));

export const getPlatformOverview = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) => {
    await assertPlatformOwner(context.userId);
    return PlatformService.getOverview();
  });

export const savePlatformPlan = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(
    z.object({
      id: z.string().optional(),
      name: z.string().trim().min(1).max(60),
      monthlyQueries: z.number().int().min(1).max(10_000_000),
    }),
  )
  .handler(async ({ context, data }) => {
    await assertPlatformOwner(context.userId);
    await PlatformService.savePlan(data);
    return { ok: true };
  });

export const setOrganizationPlan = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(
    z.object({ organizationId: z.string(), planId: z.string().nullable() }),
  )
  .handler(async ({ context, data }) => {
    await assertPlatformOwner(context.userId);
    await PlatformService.setOrganizationPlan(data.organizationId, data.planId);
    return { ok: true };
  });

export const setOrganizationSuspended = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(z.object({ organizationId: z.string(), suspended: z.boolean() }))
  .handler(async ({ context, data }) => {
    await assertPlatformOwner(context.userId);
    await PlatformService.setOrganizationSuspended({
      ...data,
      actorOrganizationId: context.organizationId,
    });
    return { ok: true };
  });

export const createPartnerInvitation = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(
    z.object({
      agencyName: z.string().trim().min(1).max(100),
      email: z.string().trim().email(),
      planId: z.string().nullable(),
    }),
  )
  .handler(async ({ context, data }) => {
    await assertPlatformOwner(context.userId);
    return PlatformService.createInvitation({
      ...data,
      createdByUserId: context.userId,
    });
  });

export const revokePartnerInvitation = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(z.object({ invitationId: z.string() }))
  .handler(async ({ context, data }) => {
    await assertPlatformOwner(context.userId);
    await PlatformService.revokeInvitation(data.invitationId);
    return { ok: true };
  });
