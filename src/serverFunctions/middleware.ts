import { createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { AppError } from "@/server/lib/errors";
import { errorHandlingMiddleware } from "@/middleware/errorHandling";
import type { EnsuredUserContext } from "@/middleware/ensure-user/types";
import { isClientRole } from "@/lib/org-permissions";
import { ensureUserMiddleware } from "@/middleware/ensureUser";

const ensuredUserContextSchema: z.ZodType<EnsuredUserContext> = z.object({
  userId: z.string(),
  userEmail: z.string(),
  emailVerified: z.boolean(),
  organizationId: z.string(),
  role: z.string(),
  project: z.any().optional(),
});

function parseContext(context: unknown): EnsuredUserContext {
  const result = ensuredUserContextSchema.safeParse(context);
  if (!result.success) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Authenticated server function context missing",
    );
  }
  return result.data;
}

// dataSEO: a client (read-only member) is refused by every server function
// except the few that opt in with requireMemberContext. New functions are
// therefore closed to clients by default.
function getAuthenticatedContext(context: unknown): EnsuredUserContext {
  const parsed = parseContext(context);
  if (isClientRole(parsed.role)) {
    throw new AppError(
      "FORBIDDEN",
      "Clientes têm acesso só de leitura pelo portal do cliente.",
    );
  }
  return parsed;
}

export const globalServerFunctionMiddleware = [
  errorHandlingMiddleware,
  ensureUserMiddleware,
] as const;

export const requireAuthenticatedContext = [
  createMiddleware({ type: "function" }).server(async ({ next, context }) => {
    const authenticatedContext = getAuthenticatedContext(context);

    return next({
      context: authenticatedContext,
    });
  }),
] as const;

export const requireProjectContext = [
  createMiddleware({ type: "function" }).server(async ({ next, context }) => {
    const authenticatedContext = getAuthenticatedContext(context);

    if (!authenticatedContext.project) {
      throw new AppError(
        "INTERNAL_ERROR",
        "Project context missing from authenticated server function",
      );
    }

    return next({
      context: {
        ...authenticatedContext,
        project: authenticatedContext.project,
        projectId: authenticatedContext.project.id,
      },
    });
  }),
] as const;

/**
 * dataSEO: like requireAuthenticatedContext, but also lets a client through.
 * Only for functions that are safe for a read-only client: their own
 * organization context and the client portal reads, which check project
 * access themselves.
 */
export const requireMemberContext = [
  createMiddleware({ type: "function" }).server(async ({ next, context }) => {
    return next({ context: parseContext(context) });
  }),
] as const;
