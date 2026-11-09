import { createServerFn } from "@tanstack/react-start";
import { RankCompetitorService } from "@/server/features/rank-tracking/services/RankCompetitorService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { listKeywordGroupsSchema as configScopeSchema } from "@/types/schemas/rank-keyword-groups";

/** Where the project's competitors ranked in a tracker's latest checks. */
export const getRankCompetitorPositions = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(configScopeSchema)
  .handler(async ({ data, context }) =>
    RankCompetitorService.getCompetitorPositions(
      data.configId,
      context.projectId,
    ),
  );
