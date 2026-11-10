import { sumBy } from "remeda";
import { toRankTrackingTimestamp } from "@/server/features/rank-tracking/rankTrackingTimestamps";
import { getOrganizationPlan } from "@/server/features/platform/organizationPlan";
import { PLAN_USAGE_HISTORY_MONTHS } from "@/shared/plan-usage";
import { AppError } from "@/server/lib/errors";
import { isHostedServerAuthMode } from "@/server/lib/runtime-env";
import { PlanUsageRepository } from "./PlanUsageRepository";

const DAY_MS = 24 * 60 * 60 * 1000;
// Months turn over at midnight in Brasília, which has had no daylight saving
// time since 2019, so it is always UTC-3.
const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000;

type Interval = "daily" | "weekly" | "monthly" | "manual";

/** The first instant of a month (0-based, may overflow) in Brasília. */
function monthStart(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1) + BRASILIA_OFFSET_MS);
}

/** SQLite stores UTC as "YYYY-MM-DD HH:MM:SS", Postgres as ISO-8601. */
function parseTimestamp(value: string) {
  return new Date(
    /^\d{4}-\d{2}-\d{2} /.test(value) ? `${value.replace(" ", "T")}Z` : value,
  );
}

/** Scheduled checks a tracker still runs before `end`, starting no earlier than now. */
function checksBefore(
  interval: Interval,
  nextCheckAt: string | null,
  now: Date,
  end: Date,
) {
  if (interval === "manual" || !nextCheckAt) return 0;
  const next = parseTimestamp(nextCheckAt);
  if (Number.isNaN(next.getTime())) return 0;
  let at = Math.max(next.getTime(), now.getTime());
  if (interval === "monthly") return at < end.getTime() ? 1 : 0;
  const step = interval === "daily" ? DAY_MS : 7 * DAY_MS;
  let checks = 0;
  for (; at < end.getTime(); at += step) checks += 1;
  return checks;
}

/**
 * The organization's plan usage: queries this month against the plan, what
 * the schedules will still use before it renews, each project's share and
 * the last months. Counts position checks only; a check that failed stored
 * nothing and used nothing.
 */
async function getOrganizationUsage(organizationId: string, now = new Date()) {
  const local = new Date(now.getTime() - BRASILIA_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const start = monthStart(year, month);
  const end = monthStart(year, month + 1);

  // Oldest first, so the current month is the last one.
  const months = Array.from({ length: PLAN_USAGE_HISTORY_MONTHS }, (_, i) => {
    const offset = PLAN_USAGE_HISTORY_MONTHS - 1 - i;
    return {
      start: monthStart(year, month - offset),
      end: monthStart(year, month - offset + 1),
    };
  });
  const [plan, projectList, trackers, ...monthCounts] = await Promise.all([
    getOrganizationPlan(organizationId),
    PlanUsageRepository.listProjects(organizationId),
    PlanUsageRepository.listActiveTrackers(organizationId),
    ...months.map((range) =>
      PlanUsageRepository.countQueriesByProject(
        organizationId,
        toRankTrackingTimestamp(range.start),
        toRankTrackingTimestamp(range.end),
      ),
    ),
  ]);
  const usedThisMonth = new Map(
    (monthCounts.at(-1) ?? []).map((row) => [row.projectId, row.queries]),
  );

  const rows = projectList.flatMap((project) => {
    const own = trackers.filter((tracker) => tracker.projectId === project.id);
    const queriesPerCheck = sumBy(
      own,
      (tracker) => tracker.keywords * (tracker.devices === "both" ? 2 : 1),
    );
    const upcoming = sumBy(
      own,
      (tracker) =>
        checksBefore(tracker.scheduleInterval, tracker.nextCheckAt, now, end) *
        tracker.keywords *
        (tracker.devices === "both" ? 2 : 1),
    );
    const used = usedThisMonth.get(project.id) ?? 0;
    if (used === 0 && upcoming === 0 && queriesPerCheck === 0) return [];
    return [
      {
        id: project.id,
        name: project.name,
        domain: project.domain,
        archived: project.archivedAt !== null,
        used,
        upcoming,
        queriesPerCheck,
        scheduleInterval:
          own.find((tracker) => tracker.scheduleInterval !== "manual")
            ?.scheduleInterval ?? "manual",
      },
    ];
  });
  rows.sort((a, b) => b.used + b.upcoming - (a.used + a.upcoming));

  const used = sumBy(rows, (row) => row.used);
  return {
    plan,
    monthStart: start.toISOString(),
    renewsAt: end.toISOString(),
    used,
    upcoming: sumBy(rows, (row) => row.upcoming),
    projects: rows,
    history: months.map((range, i) => ({
      month: range.start.toISOString(),
      used: sumBy(monthCounts[i] ?? [], (row) => row.queries),
    })),
  };
}

/** Whether a check of `queries` more still fits this month's quota. */
async function fitsQuota(
  organizationId: string,
  queries: number,
  now = new Date(),
) {
  const local = new Date(now.getTime() - BRASILIA_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const [plan, counts] = await Promise.all([
    getOrganizationPlan(organizationId),
    PlanUsageRepository.countQueriesByProject(
      organizationId,
      toRankTrackingTimestamp(monthStart(year, month)),
      toRankTrackingTimestamp(monthStart(year, month + 1)),
    ),
  ]);
  const used = sumBy(counts, (row) => row.queries);
  return used + queries <= plan.monthlyQueries;
}

/** dataSEO: refuses a manual check the month's quota can't hold (self-host only). */
async function assertFitsQuota(organizationId: string, queries: number) {
  if (await isHostedServerAuthMode()) return;
  if (!(await fitsQuota(organizationId, queries))) {
    throw new AppError("QUOTA_EXCEEDED");
  }
}

export const PlanUsageService = {
  getOrganizationUsage,
  fitsQuota,
  assertFitsQuota,
};
