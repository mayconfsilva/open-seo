import { createServerFn } from "@tanstack/react-start";
import { PortfolioService } from "@/server/features/portfolio/PortfolioService";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

/** Every project of the current organization, summarized for the carteira. */
export const getPortfolio = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) =>
    PortfolioService.list(context.organizationId),
  );
