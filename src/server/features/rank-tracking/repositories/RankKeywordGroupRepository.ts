import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { rankKeywordGroups, rankTrackingKeywords } from "@/db/schema";

// Same IN-list ceiling as the other keyword batch updates, leaving room for
// the configId and value binds.
const UPDATE_BATCH_SIZE = 90;

async function listGroups(configId: string) {
  return db
    .select({ id: rankKeywordGroups.id, name: rankKeywordGroups.name })
    .from(rankKeywordGroups)
    .where(eq(rankKeywordGroups.configId, configId))
    .orderBy(asc(rankKeywordGroups.name));
}

async function getGroup(configId: string, groupId: string) {
  const rows = await db
    .select({ id: rankKeywordGroups.id })
    .from(rankKeywordGroups)
    .where(
      and(
        eq(rankKeywordGroups.id, groupId),
        eq(rankKeywordGroups.configId, configId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function createGroup(configId: string, name: string) {
  const id = crypto.randomUUID();
  await db.insert(rankKeywordGroups).values({ id, configId, name });
  return { id, name };
}

async function renameGroup(configId: string, groupId: string, name: string) {
  const updated = await db
    .update(rankKeywordGroups)
    .set({ name })
    .where(
      and(
        eq(rankKeywordGroups.id, groupId),
        eq(rankKeywordGroups.configId, configId),
      ),
    )
    .returning({ id: rankKeywordGroups.id });
  return updated.length > 0;
}

/** Keywords in the group fall back to no group (ON DELETE SET NULL). */
async function deleteGroup(configId: string, groupId: string) {
  const deleted = await db
    .delete(rankKeywordGroups)
    .where(
      and(
        eq(rankKeywordGroups.id, groupId),
        eq(rankKeywordGroups.configId, configId),
      ),
    )
    .returning({ id: rankKeywordGroups.id });
  return deleted.length > 0;
}

async function updateKeywords(
  configId: string,
  keywordIds: string[],
  values: { groupId?: string | null; targetUrl?: string | null },
) {
  let updated = 0;
  for (let i = 0; i < keywordIds.length; i += UPDATE_BATCH_SIZE) {
    const chunk = keywordIds.slice(i, i + UPDATE_BATCH_SIZE);
    const rows = await db
      .update(rankTrackingKeywords)
      .set(values)
      .where(
        and(
          inArray(rankTrackingKeywords.id, chunk),
          eq(rankTrackingKeywords.configId, configId),
        ),
      )
      .returning({ id: rankTrackingKeywords.id });
    updated += rows.length;
  }
  return updated;
}

export const RankKeywordGroupRepository = {
  listGroups,
  getGroup,
  createGroup,
  renameGroup,
  deleteGroup,
  updateKeywords,
};
