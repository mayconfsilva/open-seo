import { inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { executeInBatches } from "@/db/runBatch";
import { rankCompetitorSnapshots } from "@/db/schema";

type CompetitorPositionRow = {
  runId: string;
  trackingKeywordId: string;
  device: "desktop" | "mobile";
  domain: string;
  position: number;
  url: string | null;
};

/**
 * Save competitor positions, keeping the best one when a check reads the same
 * keyword again (the same rule the tracked domain's own position follows).
 * Re-saving a collected round is a no-op, so workflow replays are safe.
 */
async function saveBestPositions(rows: CompetitorPositionRow[]) {
  const isBetter = sql`excluded.position < ${rankCompetitorSnapshots.position}`;
  await executeInBatches(rows, (tx, row) =>
    tx
      .insert(rankCompetitorSnapshots)
      .values(row)
      .onConflictDoUpdate({
        target: [
          rankCompetitorSnapshots.runId,
          rankCompetitorSnapshots.trackingKeywordId,
          rankCompetitorSnapshots.device,
          rankCompetitorSnapshots.domain,
        ],
        set: {
          position: sql`CASE WHEN ${isBetter} THEN excluded.position ELSE ${rankCompetitorSnapshots.position} END`,
          url: sql`CASE WHEN ${isBetter} THEN excluded.url ELSE ${rankCompetitorSnapshots.url} END`,
        },
      }),
  );
}

// D1 caps bound parameters per statement.
const RUN_IDS_PER_QUERY = 90;

async function getForRuns(runIds: string[]) {
  const rows: Array<
    Pick<
      typeof rankCompetitorSnapshots.$inferSelect,
      "runId" | "trackingKeywordId" | "device" | "domain" | "position" | "url"
    >
  > = [];
  for (let i = 0; i < runIds.length; i += RUN_IDS_PER_QUERY) {
    rows.push(
      ...(await db
        .select({
          runId: rankCompetitorSnapshots.runId,
          trackingKeywordId: rankCompetitorSnapshots.trackingKeywordId,
          device: rankCompetitorSnapshots.device,
          domain: rankCompetitorSnapshots.domain,
          position: rankCompetitorSnapshots.position,
          url: rankCompetitorSnapshots.url,
        })
        .from(rankCompetitorSnapshots)
        .where(
          inArray(
            rankCompetitorSnapshots.runId,
            runIds.slice(i, i + RUN_IDS_PER_QUERY),
          ),
        )),
    );
  }
  return rows;
}

export const RankCompetitorRepository = {
  saveBestPositions,
  getForRuns,
};
