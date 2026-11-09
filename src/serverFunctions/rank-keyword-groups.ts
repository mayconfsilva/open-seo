import { createServerFn } from "@tanstack/react-start";
import { RankKeywordGroupService } from "@/server/features/rank-tracking/services/RankKeywordGroupService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  createKeywordGroupSchema,
  deleteKeywordGroupSchema,
  listKeywordGroupsSchema,
  renameKeywordGroupSchema,
  setKeywordsGroupSchema,
  setKeywordsTargetUrlSchema,
} from "@/types/schemas/rank-keyword-groups";

export const listKeywordGroups = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(listKeywordGroupsSchema)
  .handler(async ({ data, context }) =>
    RankKeywordGroupService.listGroups(data.configId, context.projectId),
  );

export const createKeywordGroup = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(createKeywordGroupSchema)
  .handler(async ({ data, context }) =>
    RankKeywordGroupService.createGroup(
      data.configId,
      context.projectId,
      data.name,
    ),
  );

export const renameKeywordGroup = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(renameKeywordGroupSchema)
  .handler(async ({ data, context }) =>
    RankKeywordGroupService.renameGroup(
      data.configId,
      context.projectId,
      data.groupId,
      data.name,
    ),
  );

export const deleteKeywordGroup = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(deleteKeywordGroupSchema)
  .handler(async ({ data, context }) =>
    RankKeywordGroupService.deleteGroup(
      data.configId,
      context.projectId,
      data.groupId,
    ),
  );

export const setTrackingKeywordsGroup = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(setKeywordsGroupSchema)
  .handler(async ({ data, context }) =>
    RankKeywordGroupService.setKeywordsGroup(
      data.configId,
      context.projectId,
      data.keywordIds,
      data.groupId,
    ),
  );

export const setTrackingKeywordsTargetUrl = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(setKeywordsTargetUrlSchema)
  .handler(async ({ data, context }) =>
    RankKeywordGroupService.setKeywordsTargetUrl(
      data.configId,
      context.projectId,
      data.keywordIds,
      data.targetUrl,
    ),
  );
