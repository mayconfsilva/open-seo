import type { BacklinksTab } from "@/types/schemas/backlinks";
import type { BacklinksOverviewData } from "./backlinksPageTypes";

export const TAB_DESCRIPTIONS: Record<BacklinksTab, string> = {
  backlinks:
    "Veja cada link que aponta para o seu alvo, com página de origem, texto âncora e sinais de qualidade.",
  domains:
    "Veja os domínios únicos que apontam para o seu alvo, agrupados por site em vez de link a link.",
  pages:
    "Veja quais páginas do site alvo atraem mais backlinks e domínios de referência.",
};

export function buildSummaryStats(data: BacklinksOverviewData | undefined) {
  if (!data) return [];

  return [
    {
      label: "Backlinks",
      value: formatNumber(data.summary.backlinks),
      description: "Total de links apontando para este site ou página.",
    },
    {
      label: "Domínios de referência",
      value: formatNumber(data.summary.referringDomains),
      description: "Domínios únicos que apontam para este site ou página.",
    },
    {
      label: "Páginas de referência",
      value: formatNumber(data.summary.referringPages),
      description: "Páginas únicas que apontam para este site ou página.",
    },
    {
      label: "Posição",
      value: formatNumber(data.summary.rank),
      description: "Nota de autoridade da DataForSEO, de 0 a 100.",
    },
    {
      label: "Nota de spam dos backlinks",
      value: formatDecimal(data.summary.backlinksSpamScore),
      description: "Risco de spam estimado dos links que apontam para cá.",
    },
    {
      label: "Backlinks quebrados",
      value: formatNumber(data.summary.brokenBacklinks),
      description: "Links que apontam para páginas quebradas daqui.",
    },
    {
      label: "Páginas quebradas",
      value: formatNumber(data.summary.brokenPages),
      description: "Páginas quebradas daqui que ainda têm backlinks.",
    },
    {
      label: "Nota de spam do alvo",
      value: formatDecimal(data.summary.targetSpamScore),
      description: "Risco de spam estimado deste site ou página.",
    },
  ];
}

export function formatNumber(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat().format(Math.round(value));
}

export function formatDecimal(value: number | null | undefined) {
  if (value == null) return "-";
  return value.toFixed(value >= 100 ? 0 : 1);
}

export function formatTooltipValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "string") return value;
  return "-";
}

const DATE_ONLY = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/;

/**
 * A calendar date, read in the reader's own timezone.
 *
 * `new Date("2026-03-01")` is UTC midnight, and rendering that with
 * `toLocaleDateString` shows the day before anywhere west of UTC: the whole of
 * the Americas sees "Feb 28". These values are calendar dates rather than
 * instants — `normalizeHistoryDate` slices every history date to `YYYY-MM-DD`
 * before it reaches the client — so they are built as local dates. A value that
 * does carry a time is left to `Date` to parse, where the offset is real.
 */
function parseDisplayDate(value: string) {
  const dateOnly = DATE_ONLY.exec(value);
  if (!dateOnly) return new Date(value);
  const [, year, month, day] = dateOnly;
  return new Date(Number(year), Number(month) - 1, Number(day ?? "1"));
}

export function formatCompactDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = parseDisplayDate(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonthLabel(value: string) {
  const parsed = parseDisplayDate(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

export function formatRelativeTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "recently";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function extractUrlPath(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return url;
  }
}

const ELLIPSIS = "...";

export function truncateMiddle(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  if (maxLength <= ELLIPSIS.length)
    return value.slice(0, Math.max(maxLength, 0));
  const sideLength = Math.floor((maxLength - ELLIPSIS.length) / 2);
  if (sideLength <= 0) {
    return `${value.slice(0, maxLength - ELLIPSIS.length)}${ELLIPSIS}`;
  }
  return `${value.slice(0, sideLength)}${ELLIPSIS}${value.slice(-sideLength)}`;
}
