import { describe, expect, it } from "vitest";
import type { RankTrackingRow } from "@/types/schemas/rank-tracking";
import { buildActionSuggestions } from "./actionSuggestions";

function row(
  id: string,
  desktop: {
    position: number | null;
    previousPosition: number | null;
    rankingUrl?: string | null;
  },
  extra: Partial<RankTrackingRow> = {},
): RankTrackingRow {
  const device = {
    rankingUrl: null,
    serpFeatures: [],
    checkedAt: null,
    ...desktop,
  };
  return {
    trackingKeywordId: id,
    keyword: id,
    matchCase: false,
    pinned: false,
    searchVolume: null,
    keywordDifficulty: null,
    cpc: null,
    groupId: null,
    targetUrl: null,
    searchIntent: null,
    desktop: device,
    mobile: device,
    ...extra,
  };
}

const build = (
  rows: RankTrackingRow[],
  options: { planned?: string[]; competitors?: string[] } = {},
) =>
  buildActionSuggestions({
    rows,
    device: "desktop",
    competitors: (options.competitors ?? []).map((id) => ({
      trackingKeywordId: id,
      device: "desktop" as const,
      domain: "rival.com",
      position: 2,
    })),
    plannedKeywordIds: new Set(options.planned ?? []),
  });

describe("buildActionSuggestions", () => {
  it("flags a keyword that left the top 10 and names the wrong page", () => {
    const [suggestion] = build([
      row(
        "split",
        {
          position: 11,
          previousPosition: 5,
          rankingUrl: "https://site.com/blog/limpeza/",
        },
        { targetUrl: "/servicos/manutencao" },
      ),
    ]);
    expect(suggestion?.reason).toBe(
      "Saiu do top 10 (5ª → 11ª). A página encontrada é /blog/limpeza, diferente da página alvo.",
    );
  });

  it("does not count the same page written as a full URL as a wrong page", () => {
    expect(
      build([
        row(
          "kw",
          {
            position: 3,
            previousPosition: 4,
            rankingUrl: "https://site.com/servicos/",
          },
          { targetUrl: "/servicos" },
        ),
      ]),
    ).toEqual([]);
  });

  it("suggests a page when competitors are in the top 5 and the site is not on page one", () => {
    expect(
      build([row("pmoc", { position: null, previousPosition: null })], {
        competitors: ["pmoc"],
      })[0]?.source,
    ).toBe("Concorrentes");
  });

  it("leaves out keywords already in the plan", () => {
    expect(
      build([row("kw", { position: 12, previousPosition: 3 })], {
        planned: ["kw"],
      }),
    ).toEqual([]);
  });
});
