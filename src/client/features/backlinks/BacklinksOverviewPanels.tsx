import { MetricsTable } from "@/client/components/MetricsTable";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Badge } from "@/client/components/ui/badge";
import { RESEARCH_SCOPE_LABELS } from "@/shared/researchScope";
import { HelpLabel } from "@/client/components/HelpLabel";
import {
  BacklinksNewLostChart,
  BacklinksTrendChart,
} from "./BacklinksPageCharts";
import type { BacklinksOverviewData } from "./backlinksPageTypes";
import { formatRelativeTimestamp } from "./backlinksPageUtils";

type SummaryStat = { label: string; value: string; description: string };

const SCOPE_NOTES: Partial<Record<BacklinksOverviewData["scope"], string>> = {
  exact_url:
    "Mostrando backlinks desta página exata. Mude o escopo para Domínio ou Subdomínios para ver o site inteiro; os gráficos de evolução precisam de um desses.",
  subfolder:
    "Mostrando backlinks que apontam para esta subpasta. As contagens vêm dos totais filtrados; posição, evolução e a divisão por domínios de referência precisam do escopo Domínio ou Subdomínios.",
};

export function BacklinksScopeAlert({
  scope,
}: {
  scope: BacklinksOverviewData["scope"];
}) {
  const note = SCOPE_NOTES[scope];
  if (!note) return null;
  return (
    <Alert variant="info">
      <Info />
      <AlertDescription className="text-foreground">{note}</AlertDescription>
    </Alert>
  );
}

/** The header and overview sections at the top of the results card. */
export function BacklinksOverviewPanels({
  data,
  summaryStats,
}: {
  data: BacklinksOverviewData;
  summaryStats: SummaryStat[];
}) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold break-all">
            {data.displayTarget}
          </h2>
          <Badge variant="outline">{RESEARCH_SCOPE_LABELS[data.scope]}</Badge>
        </div>
        <p className="ml-auto text-xs text-muted-foreground">
          Atualizado {formatRelativeTimestamp(data.fetchedAt)}
        </p>
      </div>
      <div className="px-4 pb-4">
        <OverviewGrid data={data} summaryStats={summaryStats} />
      </div>
    </>
  );
}

function OverviewGrid({
  data,
  summaryStats,
}: {
  data: BacklinksOverviewData;
  summaryStats: SummaryStat[];
}) {
  // Trend charts need history/live, which only takes a whole hostname.
  const domainScope = data.scope === "domain" || data.scope === "subdomains";

  return (
    <div
      className={`grid grid-cols-1 gap-3 ${domainScope ? "md:grid-cols-2 xl:grid-cols-3" : ""}`}
    >
      <div
        className={`w-full max-w-xl rounded-lg border border-border p-3 ${domainScope ? "md:col-span-2 xl:col-span-1" : ""}`}
      >
        <MetricsTable
          rows={summaryStats.map((item) => ({
            label: <HelpLabel label={item.label} helpText={item.description} />,
            value: item.value,
          }))}
        />
      </div>
      {domainScope ? (
        <>
          <TrendPanel
            title="Crescimento de backlinks"
            description={
              data.scope === "domain"
                ? "Último ano · Inclui subdomínios"
                : "Backlinks e domínios de referência no último ano"
            }
          >
            <BacklinksTrendChart data={data.trends} />
          </TrendPanel>
          <TrendPanel
            title="Novos vs perdidos"
            description="Backlinks ganhos e perdidos"
          >
            <BacklinksNewLostChart data={data.newLostTrends} />
          </TrendPanel>
        </>
      ) : null}
    </div>
  );
}

function TrendPanel({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
