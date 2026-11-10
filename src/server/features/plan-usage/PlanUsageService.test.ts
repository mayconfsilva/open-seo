import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type * as PlanUsageServiceModule from "./PlanUsageService";

// Real in-memory SQLite: the month boundary and the organization scoping are
// SQL comparisons and joins, which a mocked repository can't check.

vi.mock("cloudflare:workers", () => ({
  env: { DATABASE_PROVIDER: "d1" },
}));

let client: Client;
let PlanUsageService: typeof PlanUsageServiceModule.PlanUsageService;

beforeAll(async () => {
  client = createClient({ url: "file::memory:" });
  vi.doMock("@/db", () => ({ db: drizzle(client) }));
  await client.executeMultiple(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, name TEXT NOT NULL,
      domain TEXT, archived_at TEXT, draft_since TEXT
    );
    CREATE TABLE rank_tracking_configs (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, devices TEXT NOT NULL,
      schedule_interval TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1,
      next_check_at TEXT
    );
    CREATE TABLE rank_tracking_keywords (id TEXT PRIMARY KEY, config_id TEXT NOT NULL);
    CREATE TABLE rank_check_runs (id TEXT PRIMARY KEY, project_id TEXT NOT NULL);
    CREATE TABLE platform_plans (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, monthly_queries INTEGER NOT NULL,
      created_at TEXT
    );
    CREATE TABLE organization_platform_settings (
      organization_id TEXT PRIMARY KEY, plan_id TEXT, suspended_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE user (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
    CREATE TABLE member (
      id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, user_id TEXT NOT NULL,
      role TEXT NOT NULL
    );
    CREATE TABLE rank_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL, checked_at TEXT NOT NULL
    );

    INSERT INTO projects VALUES
      ('site', 'org', 'Site', 'site.com', NULL, NULL),
      ('other', 'org_other', 'Other', 'other.com', NULL, NULL);
    -- The first account owns the platform; its organization has no quota.
    INSERT INTO user VALUES ('platform_owner', 1), ('partner', 2);
    INSERT INTO member VALUES
      ('m1', 'org_platform', 'platform_owner', 'owner'),
      ('m2', 'org', 'partner', 'owner');
    INSERT INTO platform_plans VALUES ('small', 'Pequeno', 3, NULL);
    INSERT INTO organization_platform_settings VALUES ('org', 'small', NULL, NULL);
    INSERT INTO rank_tracking_configs VALUES
      ('cfg', 'site', 'both', 'weekly', 1, '2026-11-14T12:00:00.000Z');
    INSERT INTO rank_tracking_keywords VALUES ('k1', 'cfg'), ('k2', 'cfg'), ('k3', 'cfg');
    INSERT INTO rank_check_runs VALUES ('run', 'site'), ('run_other', 'other');
    INSERT INTO rank_snapshots (run_id, checked_at) VALUES
      ('run', '2026-11-01 03:00:00'),
      ('run', '2026-11-05 10:00:00'),
      -- 23h on 31 Oct in Brasília: still October's plan.
      ('run', '2026-11-01 02:00:00'),
      ('run_other', '2026-11-05 10:00:00');
  `);
  ({ PlanUsageService } = await import("./PlanUsageService"));
});

afterAll(() => {
  client.close();
});

describe("PlanUsageService.getOrganizationUsage", () => {
  it("counts the organization's queries by Brasília month and projects the schedules", async () => {
    const usage = await PlanUsageService.getOrganizationUsage(
      "org",
      new Date("2026-11-10T15:00:00.000Z"),
    );

    expect(usage.renewsAt).toBe("2026-12-01T03:00:00.000Z");
    expect(usage.used).toBe(2);
    // Weekly checks on 14, 21 and 28 Nov, 3 keywords on 2 devices each.
    expect(usage.upcoming).toBe(18);
    expect(usage.projects.map((project) => project.id)).toEqual(["site"]);
    expect(usage.history.slice(-2).map((month) => month.used)).toEqual([1, 2]);
  });
});

describe("PlanUsageService.fitsQuota", () => {
  it("measures a check against the organization's assigned plan", async () => {
    const now = new Date("2026-11-10T15:00:00.000Z");
    // Plan of 3 queries, 2 used this month.
    expect(await PlanUsageService.fitsQuota("org", 1, now)).toBe(true);
    expect(await PlanUsageService.fitsQuota("org", 2, now)).toBe(false);
  });

  it("never limits the platform owner's own organization", async () => {
    expect(await PlanUsageService.fitsQuota("org_platform", 1_000_000)).toBe(
      true,
    );
  });
});
