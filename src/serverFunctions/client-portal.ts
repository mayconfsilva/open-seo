import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ClientPortalService } from "@/server/features/access/ClientPortalService";
import { AppError } from "@/server/lib/errors";
import { requireMemberContext } from "@/serverFunctions/middleware";

// dataSEO: the client portal. These are the only project reads a client role
// may call; each checks the caller's project grants itself.

export const getPortalProjects = createServerFn({ method: "POST" })
  .middleware(requireMemberContext)
  .handler(async ({ context }) => ClientPortalService.listProjects(context));

export const getPortalProject = createServerFn({ method: "POST" })
  .middleware(requireMemberContext)
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ context }) => {
    // ensure-user already loaded the project within the caller's organization.
    if (!context.project) throw new AppError("NOT_FOUND");
    return ClientPortalService.getProject(context, context.project);
  });
