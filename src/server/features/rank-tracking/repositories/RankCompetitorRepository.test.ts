import { beforeAll, expect, it, vi } from "vitest";
import type { Client } from "@libsql/client";
import { RankCompetitorRepository } from "./RankCompetitorRepository";

const runtime = vi.hoisted(() => ({
  env: { DATABASE_PROVIDER: "d1" },
  client: null as Client | null,
  db: null as unknown,
}));

vi.mock("cloudflare:workers", () => ({ env: runtime.env }));
vi.mock("@/db", async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  runtime.client = createClient({ url: "file::memory:" });
  runtime.db = drizzle(runtime.client);
  return { db: runtime.db };
});
// Real SQL for the conflict clause; the D1 batch wrapper is not under test.
vi.mock("@/db/runBatch", () => ({
  executeInBatches: async <T>(
    items: T[],
    build: (tx: unknown, item: T) => Promise<unknown>,
  ) => {
    for (const item of items) await build(runtime.db, item);
  },
}));

beforeAll(async () => {
  await runtime.client!.execute(`
    CREATE TABLE rank_competitor_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL,
      tracking_keyword_id TEXT NOT NULL, device TEXT NOT NULL,
      domain TEXT NOT NULL, position INTEGER NOT NULL, url TEXT,
      checked_at TEXT DEFAULT (current_timestamp) NOT NULL,
      UNIQUE (run_id, tracking_keyword_id, device, domain)
    )
  `);
});

it("keeps a competitor's best position across reads of the same check", async () => {
  const read = (position: number) =>
    RankCompetitorRepository.saveBestPositions([
      {
        runId: "run_1",
        trackingKeywordId: "kw_1",
        device: "desktop",
        domain: "rival.com",
        position,
        url: `https://rival.com/${position}`,
      },
    ]);

  await read(5);
  await read(3);
  await read(7);

  expect(await RankCompetitorRepository.getForRuns(["run_1"])).toEqual([
    expect.objectContaining({ position: 3, url: "https://rival.com/3" }),
  ]);
});
