import { ProjectContextRepository } from "@/server/features/project-context/repositories/ProjectContextRepository";
import { RankCompetitorRepository } from "@/server/features/rank-tracking/repositories/RankCompetitorRepository";
import { RankTrackingRepository } from "@/server/features/rank-tracking/repositories/RankTrackingRepository";
import { AppError } from "@/server/lib/errors";

/** Bounds the lookups per results page; a project rarely watches more. */
const MAX_COMPETITORS = 25;

/**
 * The project's competitors (from project context) to look up in a tracker's
 * results pages, leaving out the tracked domain itself.
 */
async function loadCompetitorDomains(
  projectId: string,
  trackedDomain: string,
): Promise<string[]> {
  const tracked = trackedDomain.toLowerCase().replace(/^www\./, "");
  const competitors = await ProjectContextRepository.listCompetitors(projectId);
  return competitors
    .map((competitor) => competitor.domain.toLowerCase())
    .filter((domain) => domain !== tracked)
    .slice(0, MAX_COMPETITORS);
}

/**
 * Competitor positions from the same check as each keyword's latest position,
 * so both sides of the comparison come from one results page.
 */
async function getCompetitorPositions(configId: string, projectId: string) {
  const config = await RankTrackingRepository.getConfigById({
    configId,
    projectId,
  });
  if (!config) {
    throw new AppError("NOT_FOUND", "Rank tracking config not found");
  }
  const domains = await loadCompetitorDomains(projectId, config.domain);
  const latest =
    await RankTrackingRepository.getLatestSnapshotsForKeywords(configId);
  const latestRunByPair = new Map(
    latest.map((s) => [`${s.trackingKeywordId}:${s.device}`, s.runId]),
  );
  const rows = await RankCompetitorRepository.getForRuns([
    ...new Set(latestRunByPair.values()),
  ]);
  const watched = new Set(domains);
  const positions = rows
    .filter(
      (row) =>
        watched.has(row.domain) &&
        latestRunByPair.get(`${row.trackingKeywordId}:${row.device}`) ===
          row.runId,
    )
    .map(({ trackingKeywordId, device, domain, position, url }) => ({
      trackingKeywordId,
      device,
      domain,
      position,
      url,
    }));
  return { domains, positions };
}

export const RankCompetitorService = {
  loadCompetitorDomains,
  getCompetitorPositions,
};
