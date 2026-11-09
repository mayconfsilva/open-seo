import { sortBy } from "remeda";
import { comparablePath } from "@/client/features/rank-tracking/comparablePath";
import type { RankTrackingRow } from "@/types/schemas/rank-tracking";

type Device = "desktop" | "mobile";

export interface ActionSuggestion {
  trackingKeywordId: string;
  title: string;
  reason: string;
  pageUrl: string | null;
  source: "Posições monitoradas" | "Concorrentes";
  volume: number;
}

export interface CompetitorPosition {
  trackingKeywordId: string;
  device: Device;
  domain: string;
  position: number;
}

const ordinal = (position: number) => `${position}ª`;

/**
 * Suggested tasks from the latest check: keywords that left the top 10, ones
 * where Google shows a page other than the target page, and ones where
 * competitors are in the top 5 while the site is not on the first page. One
 * suggestion per keyword, biggest search volume first; keywords already in
 * the plan are left out.
 */
export function buildActionSuggestions(input: {
  rows: RankTrackingRow[];
  device: Device;
  competitors: CompetitorPosition[];
  plannedKeywordIds: Set<string>;
}): ActionSuggestion[] {
  const competitorsByKeyword = new Map<string, CompetitorPosition[]>();
  for (const entry of input.competitors) {
    if (entry.device !== input.device || entry.position > 5) continue;
    const list = competitorsByKeyword.get(entry.trackingKeywordId) ?? [];
    list.push(entry);
    competitorsByKeyword.set(entry.trackingKeywordId, list);
  }

  const suggestions = input.rows.flatMap((row): ActionSuggestion[] => {
    if (input.plannedKeywordIds.has(row.trackingKeywordId)) return [];
    const { position, previousPosition, rankingUrl } = row[input.device];
    const base = {
      trackingKeywordId: row.trackingKeywordId,
      pageUrl: row.targetUrl ?? null,
      volume: row.searchVolume ?? 0,
    };
    const wrongPage =
      row.targetUrl !== null &&
      rankingUrl !== null &&
      comparablePath(rankingUrl) !== comparablePath(row.targetUrl);
    const wrongPageNote = wrongPage
      ? ` A página encontrada é ${comparablePath(rankingUrl)}, diferente da página alvo.`
      : "";

    const leftTop10 =
      previousPosition !== null &&
      previousPosition <= 10 &&
      (position === null || position > 10);
    if (leftTop10) {
      const now =
        position === null ? "fora das posições coletadas" : ordinal(position);
      return [
        {
          ...base,
          title: `Recuperar «${row.keyword}»`,
          reason: `Saiu do top 10 (${ordinal(previousPosition)} → ${now}).${wrongPageNote}`,
          source: "Posições monitoradas",
        },
      ];
    }
    if (wrongPage) {
      return [
        {
          ...base,
          title: `Revisar a página alvo de «${row.keyword}»`,
          reason: `O Google mostra ${comparablePath(rankingUrl)} no lugar de ${comparablePath(row.targetUrl!)}.`,
          source: "Posições monitoradas",
        },
      ];
    }
    const rivals = competitorsByKeyword.get(row.trackingKeywordId) ?? [];
    if (rivals.length > 0 && (position === null || position > 10)) {
      const names = rivals.map((rival) => rival.domain).join(" e ");
      const volume = row.searchVolume
        ? ` Volume estimado de ${row.searchVolume.toLocaleString("pt-BR")} buscas/mês.`
        : "";
      return [
        {
          ...base,
          title: `Criar ou melhorar página para «${row.keyword}»`,
          reason: `Você não está na primeira página; ${names} ${rivals.length > 1 ? "estão" : "está"} no top 5.${volume}`,
          source: "Concorrentes",
        },
      ];
    }
    return [];
  });
  return sortBy(suggestions, [(suggestion) => suggestion.volume, "desc"]);
}
