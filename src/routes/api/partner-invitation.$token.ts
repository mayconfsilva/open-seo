import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { getAuthMode } from "@/lib/auth-mode";
import {
  HOSTED_PASSWORD_MAX_LENGTH,
  HOSTED_PASSWORD_MIN_LENGTH,
} from "@/lib/auth-options";
import { AppError } from "@/server/lib/errors";

// dataSEO: the public side of a partner invitation link. GET says which
// agency the link is for; POST creates the partner's account and
// organization. The link's token is the only credential, so both answer 404
// for anything but an open invitation, and only accounts mode has them.

const acceptSchema = z.object({
  name: z.string().trim().min(1).max(100),
  password: z
    .string()
    .min(HOSTED_PASSWORD_MIN_LENGTH)
    .max(HOSTED_PASSWORD_MAX_LENGTH),
});

const noStore = { "cache-control": "no-store" };

function notFound() {
  return Response.json(
    { error: "Convite inválido, já usado ou vencido." },
    { status: 404, headers: noStore },
  );
}

async function handleGet(token: string) {
  if (getAuthMode(env.AUTH_MODE) !== "password") return notFound();
  const { PlatformService } =
    await import("@/server/features/platform/PlatformService");
  const invitation = await PlatformService.describeInvitation(token);
  if (!invitation) return notFound();
  return Response.json(invitation, { headers: noStore });
}

async function handlePost(token: string, request: Request) {
  if (getAuthMode(env.AUTH_MODE) !== "password") return notFound();
  const parsed = acceptSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Confira o nome e a senha." },
      { status: 400, headers: noStore },
    );
  }
  const { PlatformService } =
    await import("@/server/features/platform/PlatformService");
  try {
    const result = await PlatformService.acceptInvitation({
      token,
      ...parsed.data,
    });
    return Response.json(result, { headers: noStore });
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      return notFound();
    }
    if (error instanceof AppError && error.code === "CONFLICT") {
      return Response.json(
        { error: error.message },
        { status: 409, headers: noStore },
      );
    }
    console.error("partner invitation accept failed", error);
    return Response.json(
      { error: "Não foi possível criar a conta agora. Tente de novo." },
      { status: 500, headers: noStore },
    );
  }
}

export const Route = createFileRoute("/api/partner-invitation/$token")({
  server: {
    handlers: {
      GET: ({ params }) => handleGet(params.token),
      POST: ({ params, request }) => handlePost(params.token, request),
    },
  },
});
