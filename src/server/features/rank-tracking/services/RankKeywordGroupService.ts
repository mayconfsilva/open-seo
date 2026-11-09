import { isUniqueViolation } from "@/db/isUniqueViolation";
import { RankKeywordGroupRepository } from "@/server/features/rank-tracking/repositories/RankKeywordGroupRepository";
import { RankTrackingRepository } from "@/server/features/rank-tracking/repositories/RankTrackingRepository";
import { AppError } from "@/server/lib/errors";

async function requireConfig(configId: string, projectId: string) {
  const config = await RankTrackingRepository.getConfigById({
    configId,
    projectId,
  });
  if (!config) {
    throw new AppError("NOT_FOUND", "Rank tracking config not found");
  }
  return config;
}

async function withDuplicateNameError<T>(run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Já existe um grupo com esse nome",
      );
    }
    throw error;
  }
}

async function listGroups(configId: string, projectId: string) {
  await requireConfig(configId, projectId);
  return RankKeywordGroupRepository.listGroups(configId);
}

async function createGroup(configId: string, projectId: string, name: string) {
  await requireConfig(configId, projectId);
  return withDuplicateNameError(() =>
    RankKeywordGroupRepository.createGroup(configId, name),
  );
}

async function renameGroup(
  configId: string,
  projectId: string,
  groupId: string,
  name: string,
) {
  await requireConfig(configId, projectId);
  const renamed = await withDuplicateNameError(() =>
    RankKeywordGroupRepository.renameGroup(configId, groupId, name),
  );
  if (!renamed) throw new AppError("NOT_FOUND", "Grupo não encontrado");
}

async function deleteGroup(
  configId: string,
  projectId: string,
  groupId: string,
) {
  await requireConfig(configId, projectId);
  const deleted = await RankKeywordGroupRepository.deleteGroup(
    configId,
    groupId,
  );
  if (!deleted) throw new AppError("NOT_FOUND", "Grupo não encontrado");
}

async function setKeywordsGroup(
  configId: string,
  projectId: string,
  keywordIds: string[],
  groupId: string | null,
) {
  await requireConfig(configId, projectId);
  // The group must belong to this tracker; the FK alone would accept another
  // tracker's (or project's) group id.
  if (
    groupId &&
    !(await RankKeywordGroupRepository.getGroup(configId, groupId))
  ) {
    throw new AppError("NOT_FOUND", "Grupo não encontrado");
  }
  const updated = await RankKeywordGroupRepository.updateKeywords(
    configId,
    [...new Set(keywordIds)],
    { groupId },
  );
  return { updated };
}

async function setKeywordsTargetUrl(
  configId: string,
  projectId: string,
  keywordIds: string[],
  targetUrl: string,
) {
  await requireConfig(configId, projectId);
  const updated = await RankKeywordGroupRepository.updateKeywords(
    configId,
    [...new Set(keywordIds)],
    { targetUrl: targetUrl === "" ? null : targetUrl },
  );
  return { updated };
}

export const RankKeywordGroupService = {
  listGroups,
  createGroup,
  renameGroup,
  deleteGroup,
  setKeywordsGroup,
  setKeywordsTargetUrl,
};
